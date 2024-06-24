import { ReactNode } from "react";
// import { GetTreeItemChildrenFn, TreeItem, insertNode, removeNode } from "react-sortable-tree";
import { insertNode, removeNode, getNodeAtPath } from '@nosferatu500/react-sortable-tree';
import { IQuestionnaireItemType } from "../types/IQuestionnareItemType";
export interface GetTreeItemChildren {
  done: (children: TreeItem[]) => void;
  node: TreeItem;
  path: number[];
  lowerSiblingCounts: number[];
  treeIndex: number;
}
export type GetTreeItemChildrenFn = (data: GetTreeItemChildren) => void;
export interface TreeItem {
  title?: ReactNode | undefined;
  subtitle?: ReactNode | undefined;
  expanded?: boolean | undefined;
  children?: TreeItem[] | GetTreeItemChildrenFn | undefined;
  [x: string]: any;
}

export interface TreeItems {
    title: string;
    subtitle?: ReactNode | undefined;
    expanded?: boolean | undefined;
    children?: TreeItems[] | GetTreeItemChildrenFn | undefined;
    nodeType?: string;
    nodeReadableType?: string;
    [x: string]: any;
  }

interface Node {
    linkId? : number,
    title: string;
    hierarchy?: string;
    nodeType?: IQuestionnaireItemType;
    nodeReadableType?: string;
    children: Node[];
}

export interface SelectedNodes {
    node: Node,
    path: number
}

interface TreeIndexParams {
  treeIndex: number;
}

export const calculatePositionChange = (updatedTreeData: TreeItems[], treeData: TreeItems[], node: TreeItem): number | null => {
    if (!node.title) {
      return null;
    }
  
    const titleToIndexMap = new Map<string, number>();
    const nodeTitle = node.title.toString();
  
    // Map titles to their positions in updatedTreeData
    updatedTreeData.forEach((item, index) => {
      if (item.title) {
        titleToIndexMap.set(item.title.toString(), index);
      }
    });
  
    // Find the position of the specified node in treeData
    for (let index = 0; index < treeData.length; index++) {
      const item = treeData[index];
      if (item.title && item.title.toString() === nodeTitle) {
        const originalIndex = titleToIndexMap.get(nodeTitle);
        if (originalIndex !== undefined && originalIndex !== index) {
          return index - originalIndex;
        }
      }
    }
  
    return null;
  };

// // // Inserts multiple nodes in a given treeData starting at given index
export const multiNodeInsertion = (treeData: Node[], selectedNodes: SelectedNodes[], insertNodeIndex: number, nextPath : string []) => {
    let newTreeData = [...treeData];
  
    const insertionTreeIndex = (index: number) =>{
      return nextPath.length > 1? insertNodeIndex : insertNodeIndex + index
    }
  
    const sortedSelectedNodesForInsertion = [...selectedNodes].sort((a, b) => {
          return a.path - b.path;  
    });
  
    // Insert each node into the new position
    sortedSelectedNodesForInsertion.forEach(({ node }, index) => {
      const result = insertNode({
        treeData: newTreeData,
        newNode: node,
        depth: nextPath.length - 1,
        minimumTreeIndex: insertionTreeIndex(index),
        getNodeKey: ({ treeIndex } : TreeIndexParams) => treeIndex,
      });
  
      if (result && result.treeData) {
        newTreeData = result.treeData;
      }
    });
  
    return newTreeData;
  
  }
  
  // Deletes multiple nodes in a given treeData at given path
  export const multiNodeDeletion = (treeData: Node[], selectedNodes: SelectedNodes[]) => {
    let newTreeData = [...treeData];
  
    // Sort selected nodes by their path in descending order
    const sortedSelectedNodes = [...selectedNodes].sort((a, b) => {
      return b.path - a.path;
    
    });
  
    // Remove all selected nodes from their original positions
    sortedSelectedNodes.forEach(({ path }) => {
      const result = removeNode({
        treeData: newTreeData,
        path : [path],
        getNodeKey: ({ treeIndex } : TreeIndexParams) => treeIndex,
      });
  
      if (result && result.treeData) {
        newTreeData = result.treeData;
      }
    });
  
    return newTreeData;
  }