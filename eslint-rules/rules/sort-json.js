module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Ensure JSON array is sorted by label key'
    },
    fixable: 'code'
  },
  create(context) {
    return {
      JSONArray(node) {
        const elements = node.elements;
        if (!elements.every(el => el.type === 'ObjectExpression')) return;

        const sorted = [...elements].sort((a, b) => {
          const labelA = a.properties.find(p => p.key.value === 'label')?.value.value;
          const labelB = b.properties.find(p => p.key.value === 'label')?.value.value;
          return String(labelA).localeCompare(String(labelB), undefined, { numeric: true });
        });

        for (let i = 0; i < elements.length; i++) {
          if (elements[i] !== sorted[i]) {
            context.report({
              node: elements[i],
              message: 'Items should be sorted by label',
              fix(fixer) {
                const sourceCode = context.getSourceCode();
                const sortedText = sorted.map(el => sourceCode.getText(el)).join(',\n');
                return fixer.replaceTextRange([node.range[0] + 1, node.range[1] - 1], `\n${sortedText}\n`);
              }
            });
            break;
          }
        }
      }
    };
  }
};
