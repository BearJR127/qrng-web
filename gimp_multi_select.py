#!/usr/bin/env python
"""GIMP plugin to select and label multiple objects.

The plugin expects a list of rectangle coordinates and optional labels.
Each rectangle is defined as "x,y,width,height" and rectangles are separated
by semicolons. Labels are provided as a comma separated list.

Example:
    Rectangles: "10,10,32,32;50,50,32,32"
    Labels: "first,second"
"""

from gimpfu import *


def multi_select_and_label(image, drawable, rectangles_str, labels_str):
    # Parse rectangles
    rectangles = []
    for rect_part in rectangles_str.split(';'):
        rect_part = rect_part.strip()
        if not rect_part:
            continue
        try:
            x, y, w, h = [int(v.strip()) for v in rect_part.split(',')]
            rectangles.append((x, y, w, h))
        except ValueError:
            pdb.gimp_message("Invalid rectangle entry: %s" % rect_part)
            return

    # Parse labels
    labels = [label.strip() for label in labels_str.split(',') if label.strip()]

    for i, rect in enumerate(rectangles):
        x, y, w, h = rect
        label = labels[i] if i < len(labels) else 'Object %d' % (i + 1)

        pdb.gimp_image_select_rectangle(image, CHANNEL_OP_REPLACE, x, y, w, h)

        # Save selection as path with label name
        path = pdb.gimp_vectors_new(image, label)
        pdb.gimp_image_add_vectors(image, path, 0)
        pdb.gimp_vectors_stroke_new_from_selection(path)

        # Create text layer for label
        text_layer = pdb.gimp_text_layer_new(image, label, "Sans", 14, 0)
        pdb.gimp_image_insert_layer(image, text_layer, None, -1)
        pdb.gimp_layer_set_offsets(text_layer, x, max(0, y - 20))

    pdb.gimp_selection_none(image)
    pdb.gimp_displays_flush()


register(
    "python_fu_multi_object_select",
    "Select multiple objects and label them",
    "Selects rectangles from coordinates and labels them with names.",
    "OpenAI Codex",
    "OpenAI Codex",
    "2024",
    "Multi Object Select...",
    "*",
    [
        (PF_STRING, "rectangles_str", "Rectangles (x,y,w,h;...)", ""),
        (PF_STRING, "labels_str", "Labels (comma separated)", ""),
    ],
    [],
    multi_select_and_label,
    menu="<Image>/Filters"
)

main()
