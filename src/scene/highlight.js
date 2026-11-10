// 高亮：OutlinePass 选中零件
export function createHighlight(outlinePass, getScooter) {
  let current = null;

  function focus(id) {
    current = id || null;
    const scooter = getScooter();
    const part = scooter ? (scooter.parts || []).find((p) => p.id === current) : null;
    outlinePass.selectedObjects = part && part.object ? [part.object] : [];
    return part || null;
  }

  return { focus, get current() { return current; } };
}
