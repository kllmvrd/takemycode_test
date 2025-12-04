import { useReducer } from 'react';
import { arrayMove } from '@dnd-kit/sortable';

const initialState = {
  availableItems: [],
  selectedItems: [],
  availablePage: 1,
  selectedPage: 1,
  availableFilter: '',
  selectedFilter: '',
  totalAvailable: 0,
  totalSelected: 0,
  isLoadingAvailable: false,
  isLoadingSelected: false,
  pendingOperations: [],
  activeId: null,
  hasMoreAvailable: true,
  hasMoreSelected: true,
};

function itemsReducer(state, action) {
  switch (action.type) {
    case 'SET_INITIAL_DATA':
      return {
        ...state,
        availableItems: action.payload.available.items,
        totalAvailable: action.payload.available.totalCount,
        selectedItems: action.payload.selected.items.map(item => ({ ...item, status: 'confirmed' })),
        totalSelected: action.payload.selected.totalCount,
        isLoadingAvailable: false,
        isLoadingSelected: false,
        hasMoreAvailable: action.payload.available.items.length > 0,
        hasMoreSelected: action.payload.selected.items.length > 0,
      };
    
    case 'SET_FILTERED_DATA': {
      const { list, data } = action.payload;
      if (list === 'available') {
        return {
          ...state,
          availableItems: data.items,
          totalAvailable: data.totalCount,
          isLoadingAvailable: false,
          hasMoreAvailable: data.items.length > 0,
          availablePage: 1,
        };
      }
      if (list === 'selected') {
        return {
          ...state,
          selectedItems: data.items.map(item => ({ ...item, status: 'confirmed' })),
          totalSelected: data.totalCount,
          isLoadingSelected: false,
          hasMoreSelected: data.items.length > 0,
          selectedPage: 1,
        };
      }
      return state;
    }

    case 'SET_FILTER': {
      const { list, value } = action.payload;
      if (list === 'available') {
        return { ...state, availableFilter: value };
      }
      if (list === 'selected') {
        return { ...state, selectedFilter: value };
      }
      return state;
    }

    case 'LOAD_MORE_AVAILABLE':
      return {
        ...state,
        availableItems: [...state.availableItems, ...action.payload.items],
        availablePage: state.availablePage + 1,
        isLoadingAvailable: false,
      };

    case 'LOAD_MORE_SELECTED':
      return {
        ...state,
        selectedItems: [...state.selectedItems, ...action.payload.items.map(item => ({...item, status: 'confirmed'}))],
        selectedPage: state.selectedPage + 1,
        isLoadingSelected: false,
      };
    
    case 'SET_HAS_MORE':
      if (action.payload.list === 'available') {
        return { ...state, hasMoreAvailable: action.payload.value };
      }
      if (action.payload.list === 'selected') {
        return { ...state, hasMoreSelected: action.payload.value };
      }
      return state;

    case 'SET_LOADING':
      if (action.payload.list === 'available') {
        return { ...state, isLoadingAvailable: action.payload.value };
      }
      if (action.payload.list === 'selected') {
        return { ...state, isLoadingSelected: action.payload.value };
      }
      return state;

    case 'DRAG_START':
      return { ...state, activeId: action.payload };

    case 'DRAG_END':
      return { ...state, activeId: null };

    case 'DRAG_CANCEL':
      return { ...state, activeId: null };

    case 'OPTIMISTIC_MOVE': {
      const { oldIndex, newIndex, draggedItemId } = action.payload;
      const reorderedItems = arrayMove(state.selectedItems, oldIndex, newIndex);
      
      const movedItem = reorderedItems.find(item => item.id === draggedItemId);
      if (movedItem) {
        movedItem.status = 'pending';
      }

      return {
        ...state,
        selectedItems: reorderedItems,
        pendingOperations: [...state.pendingOperations.filter(op => op.itemId !== draggedItemId), {
          itemId: draggedItemId, opType: 'pending_move'
        }],
      };
    }
      
    case 'OPTIMISTIC_UPDATE': {
      const { opType, draggedItemId, sourceContainerId, destinationContainerId, overId } = action.payload;

      let newAvailable = [...state.availableItems];
      let newSelected = [...state.selectedItems];

      if (opType === 'pending_select') {
        newAvailable = newAvailable.filter(item => item.id !== draggedItemId);
        const itemToMove = { id: draggedItemId, status: 'pending' };
        let targetIndex = newSelected.length;
        if (typeof overId === 'number' && newSelected.some(item => item.id === overId)) {
          targetIndex = newSelected.findIndex(item => item.id === overId);
        }
        newSelected.splice(targetIndex, 0, itemToMove);
      } else if (opType === 'pending_deselect') {
        newSelected = newSelected.filter(item => item.id !== draggedItemId);
        newAvailable.push({ id: draggedItemId, status: 'confirmed' });
        newAvailable.sort((a, b) => a.id - b.id);
      }
      
      return {
        ...state,
        availableItems: newAvailable,
        selectedItems: newSelected,
        pendingOperations: [...state.pendingOperations.filter(op => op.itemId !== draggedItemId), {
          itemId: draggedItemId, opType, sourceContainerId, destinationContainerId,
        }],
      };
    }

    case 'REVERT_PENDING':
      return {
        ...state,
        pendingOperations: state.pendingOperations.filter(op => op.itemId !== action.payload.itemId),
      };

    case 'SSE_BATCH_UPDATE': {
      const operations = action.payload;
      let newAvailable = [...state.availableItems];
      let newSelected = [...state.selectedItems];
      let newPending = [...state.pendingOperations];

      operations.forEach(op => {
        const itemId = op.type === 'item_moved' ? op.payload.draggedItemId : op.payload;
        
        newPending = newPending.filter(p => p.itemId !== itemId);

        if (op.type === 'item_selected') {
          newAvailable = newAvailable.filter(item => item.id !== itemId);
          const existingInSelected = newSelected.find(item => item.id === itemId);
          if (existingInSelected) {
            existingInSelected.status = 'confirmed';
          } else {
            if (!state.selectedFilter || String(itemId).includes(state.selectedFilter)) {
              newSelected.push({ id: itemId, status: 'confirmed' });
            }
          }
        } 
        else if (op.type === 'item_deselected') {
          newSelected = newSelected.filter(item => item.id !== itemId);
          const existingInAvailable = newAvailable.find(i => i.id === itemId);
          if (existingInAvailable) {
            existingInAvailable.status = 'confirmed';
          } else {
            if (!state.availableFilter || String(itemId).includes(state.availableFilter)) {
              newAvailable.push({ id: itemId, status: 'confirmed' });
            }
          }
        } 
        else if (op.type === 'item_moved') {
          const { draggedItemId, targetItemId } = op.payload;
          
          const itemToMove = newSelected.find(item => item.id === draggedItemId);
          if (itemToMove) {
            newSelected = newSelected.filter(item => item.id !== draggedItemId);
            const targetIndex = newSelected.findIndex(item => item.id === targetItemId);
            
            if (targetItemId && targetIndex !== -1) {
              newSelected.splice(targetIndex, 0, { ...itemToMove, status: 'confirmed' });
            } else {
              newSelected.push({ ...itemToMove, status: 'confirmed' });
            }
          }
        }
      });
      
      newAvailable.sort((a,b) => a.id - b.id);

      return {
        ...state,
        availableItems: newAvailable,
        selectedItems: newSelected,
        pendingOperations: newPending,
        hasMoreAvailable: true,
        hasMoreSelected: true,
      };
    }
    
    default:
      return state;
  }
}

export const useItemsState = () => {
    return useReducer(itemsReducer, initialState);
};
