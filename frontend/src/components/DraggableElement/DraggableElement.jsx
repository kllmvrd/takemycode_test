import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Element from '../Element/Element';

const DraggableElement = ({ id, children, isPending, isDragging, isOverlay }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1, 
    zIndex: isOverlay ? 999 : 'auto', 
  };

  if (isOverlay) {
    return <Element id={children} />;
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} id={`element-${id}`}>
      <Element id={children} className={isPending ? 'pending' : ''} />
    </div>
  );
};

export default DraggableElement;
