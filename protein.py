#!/usr/bin/env python
"""Example GIMP plugin demonstrating safe color comparison.

This file illustrates how to convert a color string (R,G,B) to integer
values before attempting arithmetic operations.
"""

from gimpfu import *
import gimpcolor


def parse_color(color_input):
    """Parse a color string like '255,0,0' into an (R, G, B) tuple."""
    if isinstance(color_input, str):
        parts = [c.strip() for c in color_input.split(',')]
        if len(parts) != 3:
            raise ValueError("Color string must have three components")
        return tuple(int(c) for c in parts)
    return color_input


def color_match(color, target_color, tolerance):
    """Return True if the colors match within the given tolerance."""
    target_color = parse_color(target_color)
    color = tuple(int(channel) for channel in color)
    return all(abs(color[i] - target_color[i]) <= tolerance for i in range(3))


def crop_by_color(image, drawable, target_color, tolerance):
    """Dummy implementation showing how color_match could be used."""
    pdb.gimp_message("Comparing colors with tolerance %d" % tolerance)
    pixel_color = (drawable.get_pixel(0, 0)[0], drawable.get_pixel(0, 0)[1], drawable.get_pixel(0, 0)[2])
    if color_match(pixel_color, target_color, tolerance):
        pdb.gimp_message("Pixel matches target color")


register(
    "python_fu_demo_protein",
    "Demo plugin illustrating color parsing",
    "Demonstrates safe color parsing and comparison",
    "OpenAI Codex",
    "OpenAI Codex",
    "2024",
    "Demo Protein Plugin...",
    "*",
    [
        (PF_STRING, "target_color", "Target color (R,G,B)", "255,255,255"),
        (PF_INT, "tolerance", "Tolerance", 5),
    ],
    [],
    lambda image, drawable, target_color, tolerance: crop_by_color(image, drawable, target_color, tolerance),
    menu="<Image>/Filters",
)


main()
