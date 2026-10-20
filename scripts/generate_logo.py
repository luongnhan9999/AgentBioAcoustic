#!/usr/bin/env python3
"""
Generate high-resolution logo and social preview banner for AgentBioAcoustic.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def create_logo():
    width, height = 1200, 630
    img = Image.new("RGBA", (width, height), (5, 13, 10, 255)) # canopy-900
    draw = ImageDraw.Draw(img)

    # Ambient rainforest glow aura
    for i in range(320, 0, -6):
        alpha = int(40 * (1 - i / 320))
        draw.ellipse(
            [600 - i * 1.6, 270 - i * 0.9, 600 + i * 1.6, 270 + i * 0.9],
            fill=(16, 185, 129, alpha) # bio-thriving emerald
        )

    cx, cy = 600, 230

    # Draw acoustic soundwaves centered at (cx, cy)
    bar_heights = [18, 35, 55, 80, 110, 135, 105, 80, 50, 90, 130, 160, 120, 85, 45, 20]
    num_bars = len(bar_heights)
    total_w = num_bars * 18
    start_x = cx - total_w // 2

    for idx, h in enumerate(bar_heights):
        bx = start_x + idx * 18
        color = (16, 185, 129, 255) if idx % 2 == 0 else (132, 204, 22, 255) # emerald and lime
        if idx in (5, 10, 11):
            color = (6, 182, 212, 255) # bio-cyan accent
        draw.rounded_rectangle(
            [bx, cy - h // 2, bx + 10, cy + h // 2],
            radius=5,
            fill=color
        )

    # Radar sound ring around waves
    draw.ellipse([cx - 200, cy - 120, cx + 200, cy + 120], outline=(16, 185, 129, 90), width=2)
    draw.ellipse([cx - 260, cy - 160, cx + 260, cy + 160], outline=(6, 182, 212, 60), width=1)

    # Text rendering
    draw.text((cx, 400), "AGENT BIOACOUSTIC", fill=(255, 255, 255, 255), anchor="mm")
    draw.text(
        (cx, 450),
        "Autonomous Rainforest Soundscape & Poaching Defense Oracle",
        fill=(138, 166, 155, 255),
        anchor="mm"
    )
    draw.text(
        (cx, 490),
        "GenLayer StudioNet (Chain ID: 61999 • Hex: 0xF22F)",
        fill=(16, 185, 129, 255),
        anchor="mm"
    )

    out_path = Path(__file__).parent.parent / "logo.png"
    img.save(out_path, "PNG")
    print(f"[+] Saved logo to {out_path}")


if __name__ == "__main__":
    create_logo()
