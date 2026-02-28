#!/usr/bin/env bash
# GLB → USDZ Conversion Script — cm-88d.7
#
# Converts GLB 3D models to USDZ format for iOS AR Quick Look.
# Supports multiple conversion backends with automatic detection:
#   1. usdzconvert (Apple's Python-based tool, macOS only)
#   2. Reality Converter CLI (Xcode 15+, macOS only)
#   3. Blender (cross-platform, requires USD addon)
#
# Usage:
#   ./convert-usdz.sh --input model.glb [--output model.usdz] [--dry-run]
#   ./convert-usdz.sh --check-tools
#   ./convert-usdz.sh --help
#   ./convert-usdz.sh --batch --input-dir ./input --output-dir ./output/usdz

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Defaults
INPUT=""
OUTPUT=""
INPUT_DIR=""
OUTPUT_DIR=""
DRY_RUN=false
BATCH=false
VERBOSE=false
TOOL=""

# --- Tool detection ---

detect_usdzconvert() {
  command -v usdzconvert &>/dev/null
}

detect_reality_converter() {
  # Reality Converter CLI ships with Xcode 15+
  if [[ "$(uname)" == "Darwin" ]]; then
    xcrun --find reality-converter &>/dev/null 2>&1
  else
    return 1
  fi
}

detect_blender() {
  command -v blender &>/dev/null
}

detect_python_usd() {
  python3 -c "from pxr import Usd, UsdGeom" &>/dev/null 2>&1
}

select_tool() {
  if detect_usdzconvert; then
    TOOL="usdzconvert"
  elif detect_reality_converter; then
    TOOL="reality-converter"
  elif detect_blender; then
    TOOL="blender"
  elif detect_python_usd; then
    TOOL="python-usd"
  else
    TOOL="none"
  fi
}

# --- Conversion functions ---

convert_with_usdzconvert() {
  local input="$1" output="$2"
  usdzconvert "$input" "$output"
}

convert_with_reality_converter() {
  local input="$1" output="$2"
  xcrun reality-converter --input "$input" --output "$output"
}

convert_with_blender() {
  local input="$1" output="$2"
  blender --background --python-expr "
import bpy
import sys

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='$input')
bpy.ops.wm.usd_export(filepath='$output', export_textures=True)
" 2>/dev/null
}

convert_with_python_usd() {
  local input="$1" output="$2"
  python3 -c "
from pxr import Usd, UsdUtils
import sys
stage = Usd.Stage.Open('$input')
UsdUtils.CreateNewUsdzPackage(stage.GetRootLayer().identifier, '$output')
print('Converted via Python USD')
"
}

do_convert() {
  local input="$1" output="$2"

  case "$TOOL" in
    usdzconvert)       convert_with_usdzconvert "$input" "$output" ;;
    reality-converter) convert_with_reality_converter "$input" "$output" ;;
    blender)           convert_with_blender "$input" "$output" ;;
    python-usd)        convert_with_python_usd "$input" "$output" ;;
    none)
      echo "ERROR: No USDZ conversion tool found."
      echo "Install one of: usdzconvert, Reality Converter (Xcode 15+), Blender, or Python USD (pxr)"
      echo ""
      echo "Quick install options:"
      echo "  macOS:  pip3 install usdz-converter  OR  install Xcode 15+"
      echo "  Linux:  apt-get install blender  OR  pip3 install usd-core"
      echo "  CI:     See scripts/pipeline/README.md for GitHub Actions setup"
      return 1
      ;;
  esac
}

# --- Commands ---

cmd_help() {
  cat <<'USAGE'
Usage: convert-usdz.sh [OPTIONS]

Convert GLB 3D models to USDZ format for iOS AR Quick Look.

Options:
  --input FILE        Input GLB file path
  --output FILE       Output USDZ file path (default: same name, .usdz extension)
  --input-dir DIR     Input directory for batch mode
  --output-dir DIR    Output directory for batch mode
  --batch             Process all .glb files in input-dir
  --dry-run           Show what would be done without converting
  --check-tools       Detect and report available conversion tools
  --verbose           Enable verbose output
  --help              Show this help message

Examples:
  # Convert a single file
  ./convert-usdz.sh --input models/chair.glb --output output/chair.usdz

  # Batch convert all GLB files
  ./convert-usdz.sh --batch --input-dir ./input --output-dir ./output/usdz

  # Check which tools are available
  ./convert-usdz.sh --check-tools

  # Dry run (preview only)
  ./convert-usdz.sh --dry-run --input chair.glb

Supported conversion tools (auto-detected in priority order):
  1. usdzconvert     — Apple's official converter (macOS, pip install)
  2. reality-converter — Xcode 15+ CLI tool (macOS)
  3. blender          — Open-source 3D tool (cross-platform)
  4. python USD (pxr) — Pixar's USD Python bindings

CI Integration:
  For GitHub Actions, add to your workflow:
    - name: Install USD tools
      run: pip3 install usd-core
    - name: Convert models
      run: ./scripts/pipeline/convert-usdz.sh --batch --input-dir ./input --output-dir ./output/usdz
USAGE
}

cmd_check_tools() {
  echo "=== USDZ Conversion Tool Check ==="
  echo ""

  if detect_usdzconvert; then
    echo "  ✓ usdzconvert         — $(which usdzconvert)"
  else
    echo "  ✗ usdzconvert         — not found (pip3 install usdz-converter)"
  fi

  if detect_reality_converter; then
    echo "  ✓ reality-converter   — $(xcrun --find reality-converter)"
  else
    echo "  ✗ reality-converter   — not found (requires Xcode 15+ on macOS)"
  fi

  if detect_blender; then
    echo "  ✓ blender             — $(which blender)"
  else
    echo "  ✗ blender             — not found (brew install blender / apt install blender)"
  fi

  if detect_python_usd; then
    echo "  ✓ python USD (pxr)    — available"
  else
    echo "  ✗ python USD (pxr)    — not found (pip3 install usd-core)"
  fi

  echo ""
  select_tool
  if [[ "$TOOL" != "none" ]]; then
    echo "Selected tool: $TOOL"
  else
    echo "WARNING: No conversion tools available."
    echo "Install at least one tool to enable GLB → USDZ conversion."
  fi
}

cmd_convert_single() {
  local input="$1"
  local output="${2:-}"

  if [[ -z "$output" ]]; then
    output="${input%.glb}.usdz"
  fi

  select_tool

  if $DRY_RUN; then
    echo "[dry-run] Would convert: $input → $output"
    echo "[dry-run] Tool: $TOOL"
    if [[ -f "$input" ]]; then
      echo "[dry-run] Input size: $(du -h "$input" 2>/dev/null | cut -f1 || echo 'unknown')"
    else
      echo "[dry-run] Input file not found (would need to exist at runtime)"
    fi
    return 0
  fi

  if [[ ! -f "$input" ]]; then
    echo "ERROR: Input file not found: $input"
    return 1
  fi

  echo "Converting: $(basename "$input") → $(basename "$output")"
  echo "Tool: $TOOL"

  local start_time
  start_time=$(date +%s)

  do_convert "$input" "$output"

  if [[ -f "$output" ]]; then
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local size
    size=$(du -h "$output" | cut -f1)
    echo "✓ Success: $output ($size, ${duration}s)"
  else
    echo "✗ Conversion failed: no output file produced"
    return 1
  fi
}

cmd_batch() {
  local in_dir="${INPUT_DIR:-./input}"
  local out_dir="${OUTPUT_DIR:-./output/usdz}"

  if [[ ! -d "$in_dir" ]]; then
    echo "ERROR: Input directory not found: $in_dir"
    return 1
  fi

  mkdir -p "$out_dir"
  select_tool

  local count=0
  local success=0
  local failed=0

  for glb in "$in_dir"/*.glb; do
    [[ -f "$glb" ]] || continue
    count=$((count + 1))

    local basename
    basename=$(basename "$glb" .glb)
    local output="$out_dir/$basename.usdz"

    if $DRY_RUN; then
      echo "[dry-run] Would convert: $glb → $output (tool: $TOOL)"
      continue
    fi

    echo "[$count] Converting: $basename.glb → $basename.usdz"
    if do_convert "$glb" "$output" 2>/dev/null; then
      if [[ -f "$output" ]]; then
        success=$((success + 1))
        echo "  ✓ $(du -h "$output" | cut -f1)"
      else
        failed=$((failed + 1))
        echo "  ✗ No output"
      fi
    else
      failed=$((failed + 1))
      echo "  ✗ Conversion error"
    fi
  done

  if [[ $count -eq 0 ]]; then
    echo "No .glb files found in $in_dir"
    return 0
  fi

  if $DRY_RUN; then
    echo "[dry-run] Would process $count file(s) with $TOOL"
  else
    echo ""
    echo "=== Batch Complete ==="
    echo "Processed: $count | Success: $success | Failed: $failed"
  fi
}

# --- Parse arguments ---

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help)        cmd_help; exit 0 ;;
    --check-tools) cmd_check_tools; exit 0 ;;
    --input)       INPUT="$2"; shift 2 ;;
    --output)      OUTPUT="$2"; shift 2 ;;
    --input-dir)   INPUT_DIR="$2"; shift 2 ;;
    --output-dir)  OUTPUT_DIR="$2"; shift 2 ;;
    --batch)       BATCH=true; shift ;;
    --dry-run)     DRY_RUN=true; shift ;;
    --verbose)     VERBOSE=true; shift ;;
    *)             echo "Unknown option: $1"; cmd_help; exit 1 ;;
  esac
done

# --- Main ---

if $BATCH; then
  cmd_batch
elif [[ -n "$INPUT" ]]; then
  cmd_convert_single "$INPUT" "$OUTPUT"
else
  echo "ERROR: Specify --input, --batch, --check-tools, or --help"
  cmd_help
  exit 1
fi
