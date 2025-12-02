import { HeadingNode, QuoteNode } from "@lexical/rich-text"
import { ListItemNode, ListNode } from "@lexical/list"
import { CodeHighlightNode, CodeNode } from "@lexical/code"
import { AutoLinkNode, LinkNode } from "@lexical/link"
import { Klass, LexicalNode, LexicalNodeReplacement } from "lexical"

export const nodes: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement> = [
  HeadingNode,
  QuoteNode,
  ListItemNode,
  ListNode,
  CodeNode,
  CodeHighlightNode,
  AutoLinkNode,
  LinkNode,
]
