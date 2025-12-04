import React, { useEffect, useRef, useCallback } from 'react';
import { useItemsState } from './hooks/useItemsState';
import {
  getAvailableItems,
  getSelectedItems,
  selectItem,
  deselectItem,
  moveItem,
  subscribeToEvents
} from './api';
import ItemsList from './components/ItemsList/ItemsList';
import Element from './components/Element/Element';

import {
  DndContext,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  pointerWithin,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import './App.css';

function App() {
  const [state, dispatch] = useItemsState();
  const {
    availableItems, selectedItems, availablePage, selectedPage,
    availableFilter, selectedFilter, totalAvailable, totalSelected,
    isLoadingAvailable, isLoadingSelected, hasMoreAvailable, hasMoreSelected, activeId,
  } = state;

  const availableTableRef = useRef(null);
  const selectedTableRef = useRef(null);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const handleScroll = useCallback(async (listType, e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const PAGE_LIMIT = 20;

    if (scrollTop + clientHeight >= scrollHeight - 50) {
      if (listType === 'available' && !isLoadingAvailable && hasMoreAvailable) {
        dispatch({ type: 'SET_LOADING', payload: { list: 'available', value: true } });
        const data = await getAvailableItems(availablePage + 1, PAGE_LIMIT, availableFilter);
        dispatch({ type: 'LOAD_MORE_AVAILABLE', payload: data });
        if (data.items.length < PAGE_LIMIT) {
          dispatch({ type: 'SET_HAS_MORE', payload: { list: 'available', value: false } });
        }
      } else if (listType === 'selected' && !isLoadingSelected && hasMoreSelected) {
        dispatch({ type: 'SET_LOADING', payload: { list: 'selected', value: true } });
        const data = await getSelectedItems(selectedPage + 1, PAGE_LIMIT, selectedFilter);
        dispatch({ type: 'LOAD_MORE_SELECTED', payload: data });
        if (data.items.length < PAGE_LIMIT) {
          dispatch({ type: 'SET_HAS_MORE', payload: { list: 'selected', value: false } });
        }
      }
    }
  }, [availablePage, selectedPage, isLoadingAvailable, isLoadingSelected, hasMoreAvailable, hasMoreSelected, availableFilter, selectedFilter, dispatch]);

  const onDragStart = useCallback((event) => dispatch({ type: 'DRAG_START', payload: event.active.id }), [dispatch]);
  const onDragCancel = useCallback(() => dispatch({ type: 'DRAG_CANCEL' }), [dispatch]);

  const onDragEnd = useCallback(async ({ active, over }) => {
    dispatch({ type: 'DRAG_END' });
    if (!over) return;

    const { id: draggedItemId } = active;
    const { id: overId } = over;

    const sourceContainer = getContainerId(draggedItemId);
    const destinationContainer = getContainerId(overId) || over.id;

    if (!sourceContainer || !destinationContainer || (sourceContainer === destinationContainer && draggedItemId === overId)) {
      return;
    }

    if (sourceContainer === destinationContainer) {
      if (destinationContainer === 'selected') {
        const oldIndex = state.selectedItems.findIndex(item => item.id === draggedItemId);
        const newIndex = state.selectedItems.findIndex(item => item.id === overId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          dispatch({ type: 'OPTIMISTIC_MOVE', payload: { oldIndex, newIndex, draggedItemId } });
          try {
            const reorderedItems = arrayMove(state.selectedItems, oldIndex, newIndex);
            const finalIndexOfMovedItem = reorderedItems.findIndex(item => item.id === draggedItemId);
            const itemAfterMoved = reorderedItems[finalIndexOfMovedItem + 1];
            
            await moveItem(draggedItemId, itemAfterMoved ? itemAfterMoved.id : null);

          } catch (error) {
            console.error('Error during move operation:', error);
            dispatch({ type: 'REVERT_PENDING', payload: { itemId: draggedItemId } });
          }
        }
      }
    } else {
      let opType;
      if (sourceContainer === 'available' && destinationContainer === 'selected') {
        opType = 'pending_select';
      } else if (sourceContainer === 'selected' && destinationContainer === 'available') {
        opType = 'pending_deselect';
      } else {
        return;
      }

      dispatch({ type: 'OPTIMISTIC_UPDATE', payload: { opType, draggedItemId, sourceContainer, destinationContainer, overId } });

      try {
        if (opType === 'pending_select') {
          let targetItemId = (typeof overId === 'number' && state.selectedItems.some(item => item.id === overId)) ? overId : null;
          await selectItem(draggedItemId);
          if (targetItemId !== null) await moveItem(draggedItemId, targetItemId);
        } else if (opType === 'pending_deselect') {
          await deselectItem(draggedItemId);
        }
      } catch (error) {
        console.error(`Error during ${opType}:`, error);
        dispatch({ type: 'REVERT_PENDING', payload: { itemId: draggedItemId } });
      }
    }

    function getContainerId(itemId) {
      if (state.availableItems.some(item => item.id === itemId)) return 'available';
      if (state.selectedItems.some(item => item.id === itemId)) return 'selected';
      return null;
    }
  }, [state.availableItems, state.selectedItems, dispatch]);


  useEffect(() => {
    (async () => {
      dispatch({ type: 'SET_LOADING', payload: { list: 'available', value: true } });
      dispatch({ type: 'SET_LOADING', payload: { list: 'selected', value: true } });
      const [availableData, selectedData] = await Promise.all([
        getAvailableItems(1, 20, ''),
        getSelectedItems(1, 20, '')
      ]);
      dispatch({ type: 'SET_INITIAL_DATA', payload: { available: availableData, selected: selectedData } });
    })();

    const unsubscribe = subscribeToEvents((event) => {
      console.log("Received SSE event:", event);
      if (event.type === 'batch_update') {
        dispatch({ type: 'SSE_BATCH_UPDATE', payload: event.payload });
      } else if (event.type === 'new_items_added') {
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={onDragStart}
      onDragEnd={onDragEnd} 
      onDragCancel={onDragCancel}
      collisionDetection={pointerWithin}
    >
      <div className="app-container">
        <ItemsList
          id="available"
          title="Доступные элементы"
          items={availableItems}
          activeId={activeId}
          onScroll={(e) => handleScroll('available', e)}
          isLoading={isLoadingAvailable}
          tableRef={availableTableRef}
        />
        <ItemsList
          id="selected"
          title="Выбранные элементы"
          items={selectedItems}
          activeId={activeId}
          onScroll={(e) => handleScroll('selected', e)}
          isLoading={isLoadingSelected}
          tableRef={selectedTableRef}
        />
      </div>

      <DragOverlay>
        {activeId ? <Element id={activeId} isOverlay={true}/> : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;

