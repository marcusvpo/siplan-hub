import { ContentBlock } from "@/types/ProjectV2";

export const convertBlocksToTiptap = (blocks: ContentBlock[]) => {
  return {
    type: 'doc',
    content: blocks.map(block => {
      if (block.type === 'heading') {
        return {
          type: 'heading',
          attrs: { level: 2 },
          content: block.content ? [{ type: 'text', text: block.content }] : []
        };
      }
      if (block.type === 'checkbox') {
        return {
          type: 'taskList',
          content: [{
            type: 'taskItem',
            attrs: { checked: block.checked || false },
            content: [{ type: 'paragraph', content: block.content ? [{ type: 'text', text: block.content }] : [] }]
          }]
        };
      }
      // paragraph
      return {
        type: 'paragraph',
        content: block.content ? [{ type: 'text', text: block.content }] : []
      };
    })
  };
};
