import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_CRITICAL,
  KEY_ENTER_COMMAND,
  type LexicalNode,
  type RangeSelection,
} from "lexical";
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  type ListItemNode,
  type ListNode,
} from "@lexical/list";
import {
  LEXICAL_FORMAT_ITALIC,
  SUB_BULLET_ITALIC_COLOR,
} from "@/utils/default-project-observations";

function findParentListItem(node: LexicalNode | null): ListItemNode | null {
  let current: LexicalNode | null = node;
  while (current) {
    if ($isListItemNode(current)) return current;
    current = current.getParent();
  }
  return null;
}

/**
 * Verifica se o cursor está no final visual do ListItemNode (ignorando espaços
 * em branco à direita do cursor, ex.: o espaço normal ao final do rótulo).
 */
function isAtVisualEndOfListItem(
  selection: RangeSelection,
  listItem: ListItemNode,
): boolean {
  if (!selection.isCollapsed()) return false;

  const anchorNode = selection.anchor.getNode();
  const anchorOffset = selection.anchor.offset;

  if (anchorNode === listItem) {
    return anchorOffset >= listItem.getChildrenSize();
  }

  // Coleta todo o texto que existe DEPOIS do cursor dentro deste ListItemNode
  const descendants = listItem.getAllTextNodes();
  let seenAnchor = false;
  let trailingText = "";

  for (const textNode of descendants) {
    if (textNode === anchorNode) {
      seenAnchor = true;
      trailingText += textNode.getTextContent().slice(anchorOffset);
    } else if (seenAnchor) {
      trailingText += textNode.getTextContent();
    }
  }

  if (seenAnchor) {
    return trailingText.trim().length === 0;
  }

  // Fallback caso o anchor não seja um TextNode direto
  const lastChild = listItem.getLastChild();
  if (!lastChild) return true;
  if ($isTextNode(lastChild)) {
    return anchorNode === lastChild && anchorOffset >= lastChild.getTextContent().trimEnd().length;
  }
  return false;
}

function focusSubBulletWithItalicStyle(subItem: ListItemNode) {
  const newSel = subItem.selectStart();
  if ($isRangeSelection(newSel)) {
    newSel.format = LEXICAL_FORMAT_ITALIC;
    newSel.setStyle(`color: ${SUB_BULLET_ITALIC_COLOR};`);
  }
}

function getTopMostList(listNode: ListNode): ListNode {
  let current: ListNode = listNode;
  while (true) {
    const parent = current.getParent();
    if ($isListItemNode(parent)) {
      const grandParent = parent.getParent();
      if ($isListNode(grandParent)) {
        current = grandParent;
        continue;
      }
    }
    break;
  }
  return current;
}

/**
 * Plugin de ergonomia para o modelo vivo de Observações Gerais:
 * 1. Ao pressionar Enter no final de uma linha de etapa/tópico em checklist,
 *    cria automaticamente um sub-bullet aninhado (`listType="bullet"`) já em
 *    itálico cinza (#6B7280) pronto para digitar detalhes/cobranças.
 * 2. Ao pressionar Enter no final de um sub-bullet com texto, cria o próximo
 *    sub-bullet mantendo itálico cinza.
 * 3. Ao pressionar Enter em um sub-bullet vazio, remove a linha vazia e desce
 *    para um parágrafo normal (texto comum, sem itálico/cinza).
 */
export function SubBulletEnterPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand<KeyboardEvent | null>(
      KEY_ENTER_COMMAND,
      (event) => {
        if (event?.shiftKey) return false;

        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }

        const listItem = findParentListItem(selection.anchor.getNode());
        if (!listItem) return false;

        const parentList = listItem.getParent();
        if (!$isListNode(parentList)) return false;

        const parentListType = parentList.getListType();
        const grandParent = parentList.getParent();
        const isNestedSubBullet =
          parentListType === "bullet" && $isListItemNode(grandParent);

        // Caso A: Estamos dentro de um sub-bullet aninhado
        if (isNestedSubBullet) {
          const textContent = listItem.getTextContent().trim();

          // Sub-bullet vazio + Enter -> sai do sub-bullet e cria parágrafo normal
          if (textContent.length === 0) {
            event?.preventDefault();

            const topList = getTopMostList(parentList);
            const wrapperItem = grandParent;

            listItem.remove();
            if (parentList.getChildrenSize() === 0) {
              wrapperItem.remove();
            }

            const paragraph = $createParagraphNode();
            topList.insertAfter(paragraph);
            const pSel = paragraph.selectStart();
            if ($isRangeSelection(pSel)) {
              pSel.format = 0;
              pSel.setStyle("");
            }
            return true;
          }

          // Sub-bullet com texto + Enter no fim -> próximo sub-bullet em itálico cinza
          if (isAtVisualEndOfListItem(selection, listItem)) {
            event?.preventDefault();
            const nextSubItem = $createListItemNode();
            listItem.insertAfter(nextSubItem);
            focusSubBulletWithItalicStyle(nextSubItem);
            return true;
          }

          return false;
        }

        // Caso B: Estamos em uma linha de etapa/tópico principal (checklist) com texto
        if (
          parentListType === "check" &&
          listItem.getTextContent().trim().length > 0 &&
          isAtVisualEndOfListItem(selection, listItem)
        ) {
          event?.preventDefault();

          const nextSibling = listItem.getNextSibling();
          let targetSubList: ListNode | null = null;

          // Reaproveita sub-lista bullet aninhada imediatamente abaixo, se já existir
          if ($isListItemNode(nextSibling)) {
            const firstChild = nextSibling.getFirstChild();
            if ($isListNode(firstChild) && firstChild.getListType() === "bullet") {
              targetSubList = firstChild;
            }
          }

          const newSubItem = $createListItemNode();

          if (targetSubList) {
            targetSubList.append(newSubItem);
          } else {
            const wrapper = $createListItemNode();
            const bulletList = $createListNode("bullet");
            bulletList.append(newSubItem);
            wrapper.append(bulletList);
            listItem.insertAfter(wrapper);
          }

          focusSubBulletWithItalicStyle(newSubItem);
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor]);

  return null;
}
