export function setHSV(block, h, s, v) {
  block.setColour(Blockly.utils.colour.hsvToHex(h, s, v * 255));
}

export function getBlockFields(block) {
  let fields = [];
  block.inputList.forEach(input => {
    input.fieldRow.forEach(field => {
      fields.push(field);
    });
  });
  return fields;
}

export function workspaceSvgResize(workspace) {
  return Blockly.svgResize(workspace);
}

export function isWorkspaceReadOnly(workspace) {
  return false; // TODO - used for feedback
}

export function blockLimitExceeded() {
  return false;
}

export function getBlockLimit(blockType) {
  return 0;
}
