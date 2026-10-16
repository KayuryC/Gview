import os
import sys
import math
import csv

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    if os.path.exists('/opt/homebrew/bin/python3.11'):
        os.execv('/opt/homebrew/bin/python3.11', ['python3.11'] + sys.argv)
    raise

def get_fonts():
    font_paths = [
        '/System/Library/Fonts/Helvetica.ttc',
        '/System/Library/Fonts/SFNSText.ttf',
        '/System/Library/Fonts/Geneva.ttf',
        '/Library/Fonts/Arial.ttf'
    ]
    font_path = None
    for p in font_paths:
        if os.path.exists(p):
            font_path = p
            break

    if font_path:
        try:
            return (
                ImageFont.truetype(font_path, 21),
                ImageFont.truetype(font_path, 13),
                ImageFont.truetype(font_path, 13),
                ImageFont.truetype(font_path, 12),
                ImageFont.truetype(font_path, 11)
            )
        except:
            pass

    default = ImageFont.load_default()
    return (default, default, default, default, default)

def render_chart(csv_path, out_path, title, subtitle, series_configs, x_label='Tamanho da Entrada (n) [Escala Logarítmica]', y_label='Tempo de Execução (ms) [Escala Logarítmica]'):
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    width, height = 1200, 680
    margin_left, margin_right = 110, 360
    margin_top, margin_bottom = 110, 90
    plot_w = width - margin_left - margin_right
    plot_h = height - margin_top - margin_bottom

    img = Image.new('RGB', (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    font_title, font_sub, font_axis, font_legend, font_ticks = get_fonts()

    draw.text((margin_left, 24), title, fill=(15, 23, 42), font=font_title)
    draw.text((margin_left, 54), subtitle, fill=(100, 116, 139), font=font_sub)

    xs = [float(r['n']) for r in rows]
    all_vals = []
    for cfg in series_configs:
        k = cfg['key']
        for r in rows:
            v = float(r[k])
            if v > 0:
                all_vals.append(v)

    min_x, max_x = min(xs), max(xs)
    min_y = min(all_vals)
    max_y = max(all_vals)

    log_min_x = math.log10(min_x)
    log_max_x = math.log10(max_x)
    log_min_y = math.floor(math.log10(min_y))
    log_max_y = math.ceil(math.log10(max_y))
    if log_max_y == log_min_y:
        log_max_y += 1

    def to_screen(x, y):
        lx = math.log10(x)
        sx = margin_left + ((lx - log_min_x) / (log_max_x - log_min_x)) * plot_w
        ly = math.log10(y)
        sy = margin_top + plot_h - ((ly - log_min_y) / (log_max_y - log_min_y)) * plot_h
        return sx, sy

    draw.rectangle([margin_left, margin_top, margin_left + plot_w, margin_top + plot_h], outline=(203, 213, 225), width=2, fill=(248, 250, 252))

    for p in range(int(log_min_x), int(log_max_x) + 1):
        vx = 10 ** p
        sx, _ = to_screen(vx, 10 ** log_min_y)
        draw.line([(sx, margin_top), (sx, margin_top + plot_h)], fill=(226, 232, 240), width=1)
        tick_label = f'10^{p}' if p >= 3 else str(vx)
        draw.text((sx - 15, margin_top + plot_h + 10), tick_label, fill=(71, 85, 105), font=font_ticks)

    for p in range(int(log_min_y), int(log_max_y) + 1):
        vy = 10 ** p
        _, sy = to_screen(min_x, vy)
        draw.line([(margin_left, sy), (margin_left + plot_w, sy)], fill=(226, 232, 240), width=1)
        if p >= 3:
            tick_label = f'10^{p} ms'
        elif p == 0:
            tick_label = '1 ms'
        elif p > 0:
            tick_label = f'{10**p} ms'
        else:
            tick_label = f'10^{p} ms'
        draw.text((margin_left - 85, sy - 8), tick_label, fill=(71, 85, 105), font=font_ticks)

    draw.text((margin_left + plot_w / 2 - 120, margin_top + plot_h + 40), x_label, fill=(30, 41, 59), font=font_axis)
    draw.text((margin_left, 84), y_label, fill=(71, 85, 105), font=font_sub)

    for idx, cfg in enumerate(series_configs):
        k = cfg['key']
        label = cfg['label']
        col = cfg['color']
        points = []
        for r in rows:
            x = float(r['n'])
            y = float(r[k])
            if y <= 0:
                y = 10 ** log_min_y
            sx, sy = to_screen(x, y)
            points.append((sx, sy))

        for i in range(len(points) - 1):
            draw.line([points[i], points[i+1]], fill=col, width=3)

        for sx, sy in points:
            draw.ellipse([sx - 4, sy - 4, sx + 4, sy + 4], fill=col, outline=(255, 255, 255), width=2)

        leg_x = margin_left + plot_w + 20
        leg_y = margin_top + 15 + idx * 46
        draw.line([(leg_x, leg_y + 8), (leg_x + 24, leg_y + 8)], fill=col, width=3)
        draw.ellipse([leg_x + 8, leg_y + 4, leg_x + 16, leg_y + 12], fill=col, outline=(255, 255, 255), width=1)
        draw.text((leg_x + 32, leg_y), label, fill=(15, 23, 42), font=font_legend)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path)
    print(f'Gráfico gerado com sucesso: {out_path}')

def generate_all():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    results_dir = os.path.join(base_dir, 'scripts', 'results')

    slug_csv = os.path.join(results_dir, 'benchmark-slug-search.csv')
    slug_png = os.path.join(results_dir, 'grafico-busca-slug.png')
    render_chart(
        slug_csv,
        slug_png,
        'Busca por Slug: Linear O(q·n) vs. Map Indexado O(n + q)',
        'Carga com q = 100 consultas (50% existentes aleatórias, 50% ausentes)',
        [
            {'key': 'linearQueriesTotalMs', 'label': 'Linear Total (100 consultas) [O(q·n)]', 'color': (220, 38, 38)},
            {'key': 'mapTotalWithSetupMs', 'label': 'Map Total (Setup + 100 consultas) [O(n+q)]', 'color': (37, 99, 235)},
            {'key': 'mapSetupMs', 'label': 'Map (Apenas Setup do Índice) [O(n)]', 'color': (147, 51, 234)},
            {'key': 'mapQueriesOnlyMs', 'label': 'Map (Apenas 100 Consultas) [O(q)]', 'color': (5, 150, 105)},
        ],
        x_label='Tamanho do Catálogo (n) [Escala Logarítmica]',
        y_label='Tempo de Execução (ms) [Escala Logarítmica]'
    )

    status_csv = os.path.join(results_dir, 'benchmark-status-filter.csv')
    status_png = os.path.join(results_dir, 'grafico-filtro-status.png')
    render_chart(
        status_csv,
        status_png,
        'Filtro por Status: Filtro Linear vs. Map de Baldes Indexados',
        'Carga com 4 consultas por categoria (AVAILABLE, FEATURED, COMING_SOON)',
        [
            {'key': 'linearFilterMs', 'label': 'Linear (4 varreduras completas) [O(q·n)]', 'color': (220, 38, 38)},
            {'key': 'mapTotalCloneMs', 'label': 'Map Total c/ Cópia Superficial [O(n + q·k)]', 'color': (217, 119, 6)},
            {'key': 'mapTotalRefMs', 'label': 'Map Total por Referência [O(n + q)]', 'color': (37, 99, 235)},
            {'key': 'mapSetupMs', 'label': 'Map (Apenas Setup dos Baldes) [O(n)]', 'color': (147, 51, 234)},
            {'key': 'mapLookupOnlyMs', 'label': 'Map (Apenas Consultas O(1)) [O(q)]', 'color': (5, 150, 105)},
        ],
        x_label='Tamanho do Catálogo (n) [Escala Logarítmica]',
        y_label='Tempo de Execução (ms) [Escala Logarítmica]'
    )

    collection_csv = os.path.join(results_dir, 'benchmark-collection-filter.csv')
    collection_png = os.path.join(results_dir, 'grafico-diferenca-colecoes.png')
    render_chart(
        collection_csv,
        collection_png,
        'Diferença de Coleções: Ingênuo O(n·m) vs. Set O(n+m)',
        'Catálogo de tamanho n e coleção existente com m = 50% de n',
        [
            {'key': 'naiveTotalMs', 'label': 'Ingênuo (Filter + Some aninhados) [O(n·m)]', 'color': (220, 38, 38)},
            {'key': 'setTotalWithSetupMs', 'label': 'Set Total (Setup + Filtragem) [O(n+m)]', 'color': (37, 99, 235)},
            {'key': 'setSetupOnlyMs', 'label': 'Set (Apenas Construção do Set) [O(m)]', 'color': (147, 51, 234)},
            {'key': 'setFilterOnlyMs', 'label': 'Set (Apenas Filtragem com has) [O(n)]', 'color': (5, 150, 105)},
        ],
        x_label='Tamanho do Catálogo n (onde m = 0.5·n) [Escala Logarítmica]',
        y_label='Tempo de Execução (ms) [Escala Logarítmica]'
    )

if __name__ == '__main__':
    generate_all()
