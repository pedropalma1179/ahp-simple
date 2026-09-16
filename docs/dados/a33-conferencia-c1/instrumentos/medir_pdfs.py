"""A.33: medicao dos tres PDFs de C1, na maquina que os tem.

Mede o que e mecanico e imprime JSON: tamanho, SHA-256, numero de paginas, rotulos
de pagina e titulo dos metadados de cada arquivo; o modo de renderizacao do texto
nas posicoes inspecionadas; as faixas de cabecalho e rodape da pagina alvo e das
vizinhas; o recorte da linha do Saaty na p. 237; e a camada de texto em torno da
frase, por tres extratores.

NAO le a imagem. A leitura do marcador impresso e da frase e feita olhando as
imagens geradas, e registrada a parte, em medicao-pdfs.json.

Uso (fora da arvore do repositorio, e o PDF tambem fica fora):
    python medir_pdfs.py <pasta-dos-pdfs> <pasta-de-saida-das-imagens>

Dependencias, nenhuma do projeto: pypdf, pypdfium2, Pillow, e o pdftotext do
Git for Windows, se houver.
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys

import pypdf
import pypdfium2 as pdfium
import pypdfium2.version as pdfium_versao
from PIL import Image
from pypdf.generic import ContentStream

ARQUIVOS = [
    # fonte, nome do arquivo, posicao alvo (1-based), vizinhas
    ("Saaty 1977", "AHP_Scalling_Method_Saaty_1977.pdf", 4, (3, 5)),
    ("Wijnmalen 2007", "Analysis_of_benefits_opportunities_costs_and_risks_BOCR_with_the_AHP_ANP.pdf", 8, (7, 9)),
    ("Forman e Peniwati 1998", "Aggregating_individual_judgments_and_priorities_with_the_AHP.pdf", 3, (2, 4)),
]
ESCALA_MARGENS = 1.5
FAIXA_TOPO_PT, FAIXA_PE_PT = 95, 45
# Resolucao nativa das tiras CCITT do Saaty: ~1839 px sobre ~442 pt, ou 300 dpi.
ESCALA_NATIVA_SAATY = 300 / 72
# Faixa da frase na p. 237, em pontos a partir do topo: tres linhas do paragrafo.
FAIXA_FRASE_SAATY_PT = (0, 140, 442, 178)


def sha256(caminho):
    h = hashlib.sha256()
    with open(caminho, "rb") as f:
        for bloco in iter(lambda: f.read(1 << 20), b""):
            h.update(bloco)
    return h.hexdigest()


def modos_de_texto(leitor, posicao):
    """Conta operadores que mostram texto, por modo de renderizacao (Tr).
    Modo 3 e invisivel: a imagem renderizada e so a digitalizacao."""
    cs = ContentStream(leitor.pages[posicao - 1].get_contents(), leitor)
    modo, contagem = 0, {}
    for operandos, op in cs.operations:
        if op == b"Tr":
            modo = int(operandos[0])
        if op in (b"Tj", b"TJ", b"'", b'"'):
            contagem[str(modo)] = contagem.get(str(modo), 0) + 1
    return contagem


def salvar(img, caminho):
    img.save(caminho)
    return {"arquivo": os.path.basename(caminho), "pixels": list(img.size), "sha256": sha256(caminho)}


def palavras_ocr(leitor, posicao):
    cs = ContentStream(leitor.pages[posicao - 1].get_contents(), leitor)
    saida = []
    for operandos, op in cs.operations:
        if op == b"Tj":
            saida.append(str(operandos[0]))
        elif op == b"TJ":
            saida.append("".join(x for x in operandos[0] if isinstance(x, str)))
    return saida


def linha_com(texto, termo):
    linhas = texto.splitlines()
    for i, linha in enumerate(linhas):
        if termo in linha:
            return linhas[i:i + 2]
    return None


def main():
    pasta, saida = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    raiz_repo = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
    if os.path.commonpath([saida, raiz_repo]) == raiz_repo:
        sys.exit("A pasta de saida fica FORA do repositorio.")
    os.makedirs(saida, exist_ok=True)

    resultado = {
        "ferramentas": {
            "python": sys.version.split()[0],
            "pypdf": pypdf.__version__,
            "pypdfium2": pdfium_versao.PYPDFIUM_INFO.__str__(),
            "pdfium": pdfium_versao.PDFIUM_INFO.__str__(),
            "pdftotext": None,
        },
        "arquivos": [],
    }
    pdftotext = shutil.which("pdftotext")
    if pdftotext:
        v = subprocess.run([pdftotext, "-v"], capture_output=True, text=True)
        resultado["ferramentas"]["pdftotext"] = (v.stdout + v.stderr).splitlines()[0]

    for fonte, nome, alvo, vizinhas in ARQUIVOS:
        caminho = os.path.join(pasta, nome)
        leitor = pypdf.PdfReader(caminho)
        doc = pdfium.PdfDocument(caminho)
        meta = leitor.metadata or {}
        try:
            rotulos = {str(p): leitor.page_labels[p - 1] for p in (vizinhas[0], alvo, vizinhas[1])}
        except Exception as e:  # rotulo ausente nao impede a medicao
            rotulos = {"erro": str(e)}
        item = {
            "fonte": fonte,
            "caminho": caminho,
            "nome": nome,
            "tamanhoBytes": os.path.getsize(caminho),
            "sha256": sha256(caminho),
            "paginasPypdf": len(leitor.pages),
            "paginasPdfium": len(doc),
            "tituloNosMetadados": str(meta.get("/Title")) if meta.get("/Title") else None,
            "produtorNosMetadados": str(meta.get("/Producer")).rstrip("\x00") if meta.get("/Producer") else None,
            "rotulosDePagina": rotulos,
            "modosDeTextoPorPosicao": {},
            "imagens": {},
        }
        faixas = []
        for pos in (vizinhas[0], alvo, vizinhas[1]):
            item["modosDeTextoPorPosicao"][str(pos)] = modos_de_texto(leitor, pos)
            img = doc[pos - 1].render(scale=ESCALA_MARGENS).to_pil().convert("RGB")
            w, h = img.size
            topo = img.crop((0, 0, w, int(FAIXA_TOPO_PT * ESCALA_MARGENS)))
            pe = img.crop((0, h - int(FAIXA_PE_PT * ESCALA_MARGENS), w, h))
            base = os.path.join(saida, f"{nome[:12]}_pos{pos:02d}")
            item["imagens"][f"topo_pos{pos}"] = salvar(topo, base + "_topo.png")
            item["imagens"][f"pe_pos{pos}"] = salvar(pe, base + "_pe.png")

        if fonte == "Saaty 1977":
            for pos in (1, 2):
                item["modosDeTextoPorPosicao"][str(pos)] = modos_de_texto(leitor, pos)
            s = ESCALA_NATIVA_SAATY
            pagina = doc[alvo - 1].render(scale=s).to_pil().convert("RGB")
            item["imagens"]["pagina_alvo_300dpi"] = salvar(pagina, os.path.join(saida, "saaty_pos04_300dpi.png"))
            x0, t, x1, b = FAIXA_FRASE_SAATY_PT
            frase = pagina.crop((int(x0 * s), int(t * s), int(x1 * s), int(b * s)))
            item["imagens"]["frase_300dpi"] = salvar(frase, os.path.join(saida, "saaty_p237_frase.png"))
            zoom = pagina.crop((int(20 * s), int(140 * s), int(200 * s), int(176 * s)))
            zoom = zoom.resize((zoom.size[0] * 2, zoom.size[1] * 2), Image.LANCZOS)
            item["imagens"]["frase_inicio_zoom2x"] = salvar(zoom, os.path.join(saida, "saaty_p237_inicio_zoom.png"))
            for pos in (1, 2, 3):
                p = doc[pos - 1].render(scale=ESCALA_MARGENS).to_pil().convert("RGB")
                item["imagens"][f"pagina_pos{pos}"] = salvar(p, os.path.join(saida, f"saaty_pos{pos:02d}.png"))

            palavras = palavras_ocr(leitor, alvo)
            i = next(k for k, w in enumerate(palavras) if w.startswith("turns"))
            extracoes = {
                "operadoresOcrCrus": palavras[i - 1:i + 22],
                "pypdf": linha_com(leitor.pages[alvo - 1].extract_text(), "turns out"),
                "pdfium": linha_com(doc[alvo - 1].get_textpage().get_text_range(), "turns out"),
            }
            if pdftotext:
                r = subprocess.run([pdftotext, "-f", str(alvo), "-l", str(alvo), "-layout", caminho, "-"],
                                   capture_output=True, text=True, encoding="utf-8")
                extracoes["pdftotextLayout"] = [x.strip() for x in (linha_com(r.stdout, "turns out") or [])]
            item["extracaoDaCamadaDeTexto"] = extracoes
        resultado["arquivos"].append(item)

    json.dump(resultado, sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
