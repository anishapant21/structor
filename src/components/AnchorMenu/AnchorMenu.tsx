import './AnchorMenu.css';
import { DndProvider, DragSource, DragSourceConnector, ConnectDragSource } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActionType, Items, MarkedItem, OrderItem } from '../../store/treeStore/treeStore';
import { IQuestionnaireItemType } from '../../types/IQuestionnareItemType';
import {
    moveItemAction,
    newItemAction,
    reorderItemAction,
    updateMarkedLinkIdAction,
} from '../../store/treeStore/treeActions';
import { ValidationErrors } from '../../helpers/orphanValidation';
import { SortableTreeWithoutDndContext as SortableTree } from '@nosferatu500/react-sortable-tree';
import '@nosferatu500/react-sortable-tree/style.css';
import { isIgnorableItem } from '../../helpers/itemControl';
import { generateItemButtons } from './ItemButtons/ItemButtons';
import { canTypeHaveChildren, getInitialItemConfig } from '../../helpers/questionTypeFeatures';
import { TreeItem, getNodeAtPath } from '@nosferatu500/react-sortable-tree';

interface AnchorMenuProps {
    qOrder: OrderItem[];
    qItems: Items;
    qCurrentItem: MarkedItem | undefined;
    validationErrors: ValidationErrors[];
    dispatch: React.Dispatch<ActionType>;
}

interface Node {
    linkId? : number,
    title: string;
    hierarchy?: string;
    nodeType?: IQuestionnaireItemType;
    nodeReadableType?: string;
    children: Node[];
}

interface ExtendedNode {
    node: Node;
    path: string[];
    treeIndex? : number;
}

interface NodeMoveEvent {
    treeData: Node[];
    nextParentNode: Node;
    node: Node;
    nextPath: string[];
    prevPath: string[];
}

interface TreeNodeKeyParams {
    treeIndex: number;
    // Add other properties if needed, e.g., node: TreeNode;
  }

interface NodeVisibilityToggleEvent {
    node: Node;
    expanded: boolean;
}

const newNodeLinkId = 'NEW';
const externalNodeType = 'yourNodeType';

const externalNodeSpec = {
    // This needs to return an object with a property `node` in it.
    // Object rest spread is recommended to avoid side effects of
    // referencing the same object in different trees.
    beginDrag: (componentProps: { node: Node }) => ({ node: { ...componentProps.node } }),
};
const externalNodeCollect = (connect: DragSourceConnector) => ({
    connectDragSource: connect.dragSource(),
    // Add props via react-dnd APIs to enable more visual
    // customization of your component
    // isDragging: monitor.isDragging(),
    // didDrop: monitor.didDrop(),
});

const ExternalNodeBaseComponent = (props: { connectDragSource: ConnectDragSource; node: Node }): JSX.Element | null => {
    return props.connectDragSource(<div className="anchor-menu__dragcomponent">{props.node.nodeReadableType}</div>, {
        dropEffect: 'copy',
    });
};

const YourExternalNodeComponent = DragSource(
    externalNodeType,
    externalNodeSpec,
    externalNodeCollect,
)(ExternalNodeBaseComponent);

const AnchorMenu = (props: AnchorMenuProps): JSX.Element => {
    const { t } = useTranslation();
    
    const [collapsedNodes, setCollapsedNodes] = React.useState<string[]>([]);
    const [selectedNodes, setSelectedNodes] = React.useState<{ node: Node, path: string[] }[]>([]);
    const [firstSelectedIndex, setFirstSelectedIndex] = React.useState<number | null>(null);

    const mapToTreeData = (item: OrderItem[], hierarchy: string, parentLinkId?: string): Node[] => {
        return item
            .filter((x) => {
                const parentItem = parentLinkId ? props.qItems[parentLinkId] : undefined;
                return !isIgnorableItem(props.qItems[x.linkId], parentItem);
            })
            .map((x, index) => {
                const newHierarchy = `${hierarchy}${index + 1}.`;
                return {
                    title: x.linkId,
                    hierarchy: newHierarchy,
                    children: mapToTreeData(x.items, newHierarchy, x.linkId),
                    expanded: collapsedNodes.indexOf(x.linkId) === -1,
                };
            });
    };

    const orderTreeData = mapToTreeData(props.qOrder, '');

    const handleOnNodeClick = (event: React.MouseEvent, node: Node, extendedNode : ExtendedNode) => {
        const {path, treeIndex} = extendedNode

        if (event.shiftKey && firstSelectedIndex !== null && treeIndex !=undefined) {
            // Select range of nodes between firstSelectedIndex and treeIndex
            let startIndex = Math.min(firstSelectedIndex, treeIndex);
            let endIndex = Math.max(firstSelectedIndex, treeIndex);
        
            // handle cases for reverse mode - firstSelectedIndex is the first one and treeIndex is the second one
            if (firstSelectedIndex > treeIndex) {
              startIndex = startIndex - 1;
              endIndex = endIndex - 1
            }
           
            const newSelectedNodes: { node: Node; path: string[]; }[] = [];
            for (let i = startIndex + 1; i <= endIndex; i++) {
            const result = getNodeAtPath({
                treeData: orderTreeData,
                path: [i],
                getNodeKey: ({ treeIndex }: TreeNodeKeyParams) => treeIndex,
              });
      
              if (result && result.node) {
                const nodeExists = selectedNodes.some(
                  (item) => item.node.title === result.node.title
                );
      
                if (!nodeExists) {
                  newSelectedNodes.push({ node: result.node as Node, path: [result.treeIndex] as string[] });
                }
              }
            }
            setSelectedNodes((prev) => [...prev, ...newSelectedNodes]);
          } else {
            setSelectedNodes((prev) => {
                const nodeExists = prev.some(
                (item) => item.node.title === node.title
                );
                if (nodeExists) {
                return prev.filter((item) => item.node.title !== node.title);
                } else {
                return [...prev, { node, path }];
                }
            });
          }
   
        if(treeIndex !=null){
            setFirstSelectedIndex(treeIndex);
        }
      };

    const getNodeKey = (extendedNode: ExtendedNode): string => {
        return extendedNode.node.title;
    };

    const treePathToOrderArray = (treePath: string[]): string[] => {
        const newPath = [...treePath];
        newPath.splice(-1);
        return newPath;
    };

    const hasValidationError = (linkId: string): boolean => {
        return props.validationErrors.some((error) => error.linkId === linkId);
    };

    const isSelectedItem = (linkId: string): boolean => {
        return props.qCurrentItem?.linkId === linkId;
    };

    const isNodeHighlighted = (node: any) => {
        return selectedNodes.some(
          (item) => item.node.title === node.title);
      }

    const getRelevantIcon = (type?: string) => {
        switch (type) {
            case IQuestionnaireItemType.group:
                return 'folder-icon';
            case IQuestionnaireItemType.display:
                return 'message-icon';
            default:
                return 'question-icon';
        }
    };

    const createTypeComponent = (type: IQuestionnaireItemType, text: string): JSX.Element => {
        return (
            <YourExternalNodeComponent
                node={{
                    title: newNodeLinkId,
                    nodeType: type,
                    nodeReadableType: text,
                    children: [],
                }}
            />
        );
    };

  
    return (
        <DndProvider backend={HTML5Backend}>
            <div className="questionnaire-overview">
                <div className="questionnaire-overview__toolbox">
                    <strong>{t('Components')}</strong>
                    {createTypeComponent(IQuestionnaireItemType.group, t('Group'))}
                    {createTypeComponent(IQuestionnaireItemType.string, t('Text answer'))}
                    {createTypeComponent(IQuestionnaireItemType.display, t('Information text'))}
                    {createTypeComponent(IQuestionnaireItemType.attachment, t('Attachment'))}
                    {createTypeComponent(IQuestionnaireItemType.receiver, t('Recipient list'))}
                    {createTypeComponent(IQuestionnaireItemType.receiverComponent, t('Recipient component'))}
                    {createTypeComponent(IQuestionnaireItemType.boolean, t('Confirmation'))}
                    {createTypeComponent(IQuestionnaireItemType.choice, t('Choice'))}
                    {createTypeComponent(IQuestionnaireItemType.date, t('Date'))}
                    {createTypeComponent(IQuestionnaireItemType.time, t('Time'))}
                    {createTypeComponent(IQuestionnaireItemType.integer, t('Number'))}
                    {createTypeComponent(IQuestionnaireItemType.quantity, t('Quantity'))}
                </div>
                <SortableTree
                    className="questionnaire-overview__treeview"
                    dndType={externalNodeType}
                    treeData={orderTreeData}
                    onChange={() => {
                        /* dummy */
                    }}
                    getNodeKey={getNodeKey}
                    onMoveNode={({ treeData, nextParentNode, node, nextPath, prevPath }: NodeMoveEvent) => {
                        const newPath = treePathToOrderArray(nextPath);
                        // find parent node:
                        const moveIndex = nextParentNode
                            ? nextParentNode.children.findIndex((x: Node) => x.title === node.title)
                            : treeData.findIndex((x: Node) => x.title === node.title);

                        if (node.title === newNodeLinkId && node.nodeType) {
                            props.dispatch(
                                newItemAction(
                                    getInitialItemConfig(node.nodeType, t('Recipient component')),
                                    newPath,
                                    moveIndex,
                                ),
                            );
                        } else {
                            const oldPath = treePathToOrderArray(prevPath);
                            // reorder within same parent
                            if (JSON.stringify(newPath) === JSON.stringify(oldPath)) {
                                props.dispatch(reorderItemAction(node.title, newPath, moveIndex));
                            } else {
                                props.dispatch(moveItemAction(node.title, newPath, oldPath, moveIndex));
                            }
                        }
                    }}
                    onVisibilityToggle={({ node, expanded }: NodeVisibilityToggleEvent) => {
                        const filteredNodes = collapsedNodes.filter((x) => x !== node.title);
                        if (!expanded) {
                            filteredNodes.push(node.title);
                        }
                        setCollapsedNodes(filteredNodes);
                    }}
                    canNodeHaveChildren={(node: Node): boolean => {
                        const item = props.qItems[node.title];
                        return item ? canTypeHaveChildren(item) : false;
                    }}
                    generateNodeProps={(extendedNode: ExtendedNode) => ({
                        onClick: (event: React.MouseEvent) => {
                            event.stopPropagation();
                            const target = event.target as HTMLElement;
                            const clickedItemClassName = target.className;
            
                            if (
                              clickedItemClassName !== 'rstcustom__expandButton' &&
                              clickedItemClassName !== 'rst__collapseButton'
                            ) {
            
                              handleOnNodeClick(event, extendedNode.node, extendedNode)
                            }
            
                          },
                        className: `anchor-menu__item 
                            ${hasValidationError(extendedNode.node.title) ? 'validation-error' : ''} 
                            ${extendedNode.path.length === 1 ? 'anchor-menu__topitem' : ''} 
                            ${isNodeHighlighted(extendedNode.node) ? "selectedHighlight" : ""}
                            ${isSelectedItem(extendedNode.node.title) ? 'anchor-menu__item--selected' : ''} 
                        `,
                        title: (
                            <span
                                className="anchor-menu__inneritem"
                                onClick={() => {
                                    props.dispatch(
                                        updateMarkedLinkIdAction(
                                            extendedNode.node.title,
                                            treePathToOrderArray(extendedNode.path),
                                        ),
                                    );
                                }}
                            >
                                <span className={getRelevantIcon(props.qItems[extendedNode.node.title]?.type)} />
                                <span className="anchor-menu__title">
                                    {extendedNode.node.hierarchy}
                                    {` `}
                                    {props.qItems[extendedNode.node.title]?.text}
                                </span>
                            </span>
                        ),
                        buttons: generateItemButtons(
                            t,
                            props.qItems[extendedNode.node.title],
                            treePathToOrderArray(extendedNode.path),
                            false,
                            props.dispatch,
                        ),
                    })}
                />
                {props.qOrder.length === 0 && (
                    <p className="anchor-menu__placeholder">
                        {t(
                            'Here you will find a summary of questionnaire elements. Drag a component here to start building this Questionnaire',
                        )}
                    </p>
                )}
            </div>
        </DndProvider>
    );
};

export default AnchorMenu;
