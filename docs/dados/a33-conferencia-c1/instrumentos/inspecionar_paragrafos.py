"""A.33: paragrafos completos de Wijnmalen p. 899 e Forman p. 167, na maquina que tem os PDFs.

Para cada arquivo: recalcula o SHA-256 e o compara com o registrado em
medicao-pdfs.json. Divergindo, NAO segue com aquele arquivo.

Depois: conta os operadores de texto por modo de renderizacao e as imagens da
pagina; localiza o paragrafo pelas coordenadas da propria camada de texto;
renderiza a pagina a 300 dpi e recorta o paragrafo; e extrai o paragrafo por
tres vias, vinculando a extracao ao SHA-256 recalculado.

NAO le as imagens: a leitura do impresso e observacao, registrada a parte, em
inspecao-wijnmalen-forman.json.

Uso, com a saida FORA do repositorio:
    python inspecionar_paragrafos.py <pasta-dos-pdfs> <pasta-de-saida>
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata

import pypdf
import pypdfium2 as pdfium
import pypdfium2.version as pdfium_versao
from pypdf.generic import ContentStream

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
ESCALA = 300 / 72

ALVOS = [
    {
        "fonte": "Wijnmalen 2007",
        "nome": "Analysis_of_benefits_opportunities_costs_and_risks_BOCR_with_the_AHP_ANP.pdf",
        "posicao": 8,
        "tipo": "texto vetorial visivel",
        "inicio": "Numbers on derived ratio scales",
        "fim": "meaningful BOCR ratio results.",
        "colunaPt": (30, 520),
        "tabela": ("Table 6", "Additive with subtraction"),
        "frases": [
            "Synthesis however requires commensurate priorities on a common scale. Therefore, there is a need "
            "to know the magnitude relationship between total benefits and total costs and total opportunities "
            "and total risks.",
        ],
    },
    {
        "fonte": "Forman e Peniwati 1998",
        "nome": "Aggregating_individual_judgments_and_priorities_with_the_AHP.pdf",
        "posicao": 3,
        "tipo": "digitalizacao com camada OCR",
        "titulo": "Geometric mean or arithmetic",
        "inicio": "In general one must decide",
        "fim": "provided",
        "colunaPt": (270, 515),
        "frases": [
            "Treating the group as a new ‘individual’ with AIJ requires satisfaction of the reciprocity "
            "condition for the judgments.",
            "Thus, for AIJ, the geometric mean must be used.",
        ],
        "palavraEnfatizada": "must",
    },
]


def sha256(caminho):
    h = hashlib.sha256()
    with open(caminho, "rb") as f:
        for bloco in iter(lambda: f.read(1 << 20), b""):
            h.update(bloco)
    return h.hexdigest()


def salvar(img, caminho):
    img.save(caminho)
    return {"arquivo": os.path.basename(caminho), "pixels": list(img.size), "sha256": sha256(caminho)}


def operadores(leitor, posicao):
    """Operadores que mostram texto, com modo de renderizacao e fonte de cada um."""
    cs = ContentStream(leitor.pages[posicao - 1].get_contents(), leitor)
    modo, fonte, saida = 0, None, []
    for operandos, op in cs.operations:
        if op == b"Tr":
            modo = int(operandos[0])
        elif op == b"Tf":
            fonte = str(operandos[0])
        elif op == b"Tj":
            saida.append((str(operandos[0]), modo, fonte))
        elif op == b"TJ":
            saida.append(("".join(x for x in operandos[0] if isinstance(x, str)), modo, fonte))
    return saida


def caixa(textpage, altura, termo):
    """Topo e base, em pontos a partir do topo, do primeiro caractere de `termo`."""
    busca = textpage.search(termo)
    achado = busca.get_next()
    if not achado:
        return None
    x0, base, x1, topo = textpage.get_charbox(achado[0])
    return {"termo": termo, "x0": round(x0, 1), "topo": round(altura - topo, 1), "base": round(altura - base, 1)}


def normalizar(texto):
    """Declarada no registro: marcador de hifen do PDFium e hifen de fim de linha
    sao desfeitos, inclusive com espaco antes da quebra, como o pypdf entrega;
    quebras viram espaco, e espacos repetidos se reduzem. Ligaduras NAO se
    desfazem aqui: isso fica em `semLigaduras`, separado."""
    t = texto.replace("\r", "").replace("￾", "").replace("­", "")
    t = re.sub(r"-[ \t]*\n", "", t).replace("\n", " ")
    return " ".join(t.split())


def sem_ligaduras(texto):
    """So as ligaduras latinas U+FB00 a U+FB06, por NFKC caractere a caractere.
    Aspas tipograficas e demais caracteres ficam como estao."""
    return "".join(unicodedata.normalize("NFKC", c) if "ﬀ" <= c <= "ﬆ" else c for c in texto)


def paragrafo(texto, inicio, fim):
    i = texto.find(inicio)
    if i < 0:
        return None
    j = texto.find(fim, i)
    if j < 0:
        return None
    k = texto.find("\n", j)
    return texto[i:(k if k >= 0 else len(texto))]


def main():
    pasta, saida = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    if os.path.commonpath([saida, RAIZ]) == RAIZ:
        sys.exit("A pasta de saida fica FORA do repositorio.")
    os.makedirs(saida, exist_ok=True)
    registrados = {a["fonte"]: a["sha256"]["recalculadoNestaSessao"] for a in json.load(
        open(os.path.join(RAIZ, "docs/dados/a33-conferencia-c1/medicao-pdfs.json"), encoding="utf-8"))["arquivos"]}
    pdftotext = shutil.which("pdftotext")
    resultado = {
        "ferramentas": {
            "python": sys.version.split()[0],
            "pypdf": pypdf.__version__,
            "pypdfium2": str(pdfium_versao.PYPDFIUM_INFO),
            "pdfium": str(pdfium_versao.PDFIUM_INFO),
            "pdftotext": subprocess.run([pdftotext, "-v"], capture_output=True, text=True).stderr.splitlines()[0]
            if pdftotext else None,
        },
        "arquivos": [],
    }
    for alvo in ALVOS:
        caminho = os.path.join(pasta, alvo["nome"])
        item = {"fonte": alvo["fonte"], "caminho": caminho, "tamanhoBytes": os.path.getsize(caminho),
                "sha256Recalculado": sha256(caminho), "sha256Registrado": registrados[alvo["fonte"]]}
        item["sha256Coincide"] = item["sha256Recalculado"] == item["sha256Registrado"]
        if not item["sha256Coincide"]:
            item["conferencia"] = "INTERROMPIDA: hash divergente, identidade do arquivo a esclarecer"
            resultado["arquivos"].append(item)
            continue

        leitor = pypdf.PdfReader(caminho)
        doc = pdfium.PdfDocument(caminho)
        pos = alvo["posicao"]
        ops = operadores(leitor, pos)
        modos = {}
        for _, m, _ in ops:
            modos[str(m)] = modos.get(str(m), 0) + 1
        xobj = leitor.pages[pos - 1]["/Resources"].get("/XObject")
        imagens = 0
        if xobj:
            imagens = sum(1 for v in xobj.get_object().values() if v.get_object().get("/Subtype") == "/Image")
        item.update({"posicao": pos, "tipo": alvo["tipo"], "modosDeTexto": modos, "imagensNaPagina": imagens})

        pagina = doc[pos - 1]
        altura = pagina.get_height()
        tp = pagina.get_textpage()
        marcas = {"inicio": caixa(tp, altura, alvo["inicio"]), "fim": caixa(tp, altura, alvo["fim"])}
        if "titulo" in alvo:
            marcas["titulo"] = caixa(tp, altura, alvo["titulo"])
        item["coordenadas"] = marcas
        img = pagina.render(scale=ESCALA).to_pil().convert("RGB")
        item["imagens"] = {"pagina_300dpi": salvar(img, os.path.join(saida, f"{alvo['nome'][:10]}_pos{pos:02d}.png"))}
        x0, x1 = alvo["colunaPt"]
        topo = (marcas.get("titulo") or marcas["inicio"])["topo"] - 6
        base = marcas["fim"]["base"] + 6
        corte = img.crop((int(x0 * ESCALA), int(topo * ESCALA), int(x1 * ESCALA), int(base * ESCALA)))
        item["imagens"]["paragrafo"] = salvar(corte, os.path.join(saida, f"{alvo['nome'][:10]}_paragrafo.png"))
        item["recortePt"] = [x0, round(topo, 1), x1, round(base, 1)]
        if "tabela" in alvo:
            t0, t1 = caixa(tp, altura, alvo["tabela"][0]), caixa(tp, altura, alvo["tabela"][1])
            tab = img.crop((int(x0 * ESCALA), int((t0["topo"] - 6) * ESCALA),
                            int(x1 * ESCALA), int((t1["base"] + 8) * ESCALA)))
            item["imagens"]["tabela6"] = salvar(tab, os.path.join(saida, f"{alvo['nome'][:10]}_tabela6.png"))

        vias = {
            "pypdf": leitor.pages[pos - 1].extract_text(),
            "pdfium": tp.get_text_range(),
        }
        if pdftotext:
            vias["pdftotext"] = subprocess.run([pdftotext, "-enc", "UTF-8", "-f", str(pos), "-l", str(pos),
                                                caminho, "-"],
                                               capture_output=True, text=True, encoding="utf-8").stdout
        extracao = {"vinculadaAoSha256": item["sha256Recalculado"], "vias": {}}
        for nome, texto in vias.items():
            bruto = paragrafo(texto, alvo["inicio"], alvo["fim"])
            norm = normalizar(bruto) if bruto else None
            extracao["vias"][nome] = {
                "paragrafoBruto": bruto,
                "paragrafoNormalizado": norm,
                "ligaduras": sorted({c for c in (norm or "") if "ﬀ" <= c <= "ﬆ"}),
                "contemAsFrases": [bool(norm and f in norm) for f in alvo["frases"]],
                "contemAsFrasesSemLigaduras": [bool(norm and f in sem_ligaduras(norm)) for f in alvo["frases"]],
            }
        if "palavraEnfatizada" in alvo:
            fontes = {str(k): str(v.get_object().get("/BaseFont"))
                      for k, v in leitor.pages[pos - 1]["/Resources"]["/Font"].items()}
            seq = [(w.strip(), f) for w, _, f in ops]
            k = next(i for i, (w, _) in enumerate(seq)
                     if w == "Thus," and seq[i + 1][0] == "for" and seq[i + 2][0] == "AIJ,")
            extracao["fonteDasPalavras"] = [[w, fontes.get(f, f)] for w, f in seq[k:k + 9]]
        item["extracao"] = extracao
        resultado["arquivos"].append(item)

    json.dump(resultado, sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
