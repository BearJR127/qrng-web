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
import gimpcolor


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




# Additional plugin to crop circular objects and analyze pixel histogram
import csv
import os


def crop_circle_analyze(
    image, drawable, method, color_str, threshold, center_x, center_y,
    radius, grow, shrink, csv_path
):
    """Crop a circular selection then convert to B&W and export histogram."""
    pdb.gimp_image_undo_group_start(image)
    try:
        if method == 0:  # By color
            try:
                r, g, b = [int(v.strip()) for v in color_str.split(',')]
                sel_color = gimpcolor.RGB(r, g, b)
            except Exception:
                pdb.gimp_message("Invalid color string. Use R,G,B")
                return
            pdb.gimp_context_set_sample_threshold(threshold)
            pdb.gimp_image_select_color(image, CHANNEL_OP_REPLACE, drawable, sel_color)
        else:  # Circular shape
            pdb.gimp_image_select_ellipse(
                image,
                CHANNEL_OP_REPLACE,
                int(center_x - radius),
                int(center_y - radius),
                int(radius * 2),
                int(radius * 2),
            )

        if grow > 0:
            pdb.gimp_selection_grow(image, grow)
        if shrink > 0:
            pdb.gimp_selection_shrink(image, shrink)

        ok, x1, y1, x2, y2 = pdb.gimp_selection_bounds(image)
        if not ok:
            pdb.gimp_message("No selection to crop")
            return
        pdb.gimp_image_crop(image, x2 - x1, y2 - y1, x1, y1)

        pdb.gimp_image_convert_grayscale(image)
        pdb.gimp_brightness_contrast(image.active_layer, 90, 90)

        total = pdb.gimp_histogram(image.active_layer, HISTOGRAM_VALUE, 0, 255)[3]
        integ = pdb.gimp_histogram(image.active_layer, HISTOGRAM_VALUE, 0, 100)[3]

        out_path = os.path.expanduser(csv_path)
        with open(out_path, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["integrated_pixels", "total_pixels"])
            writer.writerow([int(integ), int(total)])
        pdb.gimp_message("Saved histogram data to %s" % out_path)
    finally:
        pdb.gimp_image_undo_group_end(image)
        pdb.gimp_displays_flush()


register(
    "python_fu_crop_circle_analyze",
    "Crop circular selection and analyze histogram",
    "Crop by color or circle then analyze pixel range.",
    "OpenAI Codex",
    "OpenAI Codex",
    "2024",
    "Circular Crop And Analyze...",
    "*",
    [
        (PF_OPTION, "method", "Selection method", 0, ["Color", "Circle"]),
        (PF_STRING, "color_str", "Color (R,G,B)", "255,255,255"),
        (PF_INT, "threshold", "Color threshold", 30),
        (PF_INT, "center_x", "Circle center X", 0),
        (PF_INT, "center_y", "Circle center Y", 0),
        (PF_INT, "radius", "Circle radius", 50),
        (PF_INT, "grow", "Grow selection", 0),
        (PF_INT, "shrink", "Shrink selection", 0),
        (PF_FILENAME, "csv_path", "CSV output path", "~/histogram.csv"),
    ],
    [],
    crop_circle_analyze,
    menu="<Image>/Filters",
)

main()
