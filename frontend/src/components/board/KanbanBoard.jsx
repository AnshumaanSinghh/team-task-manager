import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';
import { StatusIcon } from '../ui/Bits';
import { COLUMNS, byOrder, openBlockers } from '../../lib/format';

export default function KanbanBoard({ tasks, allTasks, wipLimits = {}, focusTaskId, onDragStart, onDragEnd, onOpen, onAdd, canAdd }) {
  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto scroll-thin pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory sm:snap-none">
        {COLUMNS.map((col, ci) => {
          const items = tasks.filter((t) => t.status === col.key).sort(byOrder);
          const count = allTasks.filter((t) => t.status === col.key).length;
          const limit = col.wip ? wipLimits[col.wip] || 0 : 0;
          const over = limit > 0 && count > limit;
          const points = items.reduce((n, t) => n + (t.estimate || 0), 0);

          return (
            <motion.section key={col.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="w-[82vw] sm:w-[300px] xl:flex-1 xl:min-w-[260px] flex-none snap-start flex flex-col rounded-2xl border border-line bg-surface-2/60 max-h-[calc(100vh-230px)] min-h-[320px]"
              aria-label={`${col.key} column`}>
              <header className={`flex items-center gap-2 px-3.5 py-3 border-b rounded-t-2xl ${over ? 'hazard border-b' : 'border-line'}`}>
                <StatusIcon status={col.key} size={15} />
                <h3 className="text-sm font-semibold">{col.key}</h3>
                <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded-md ${over ? 'bg-fg text-bg font-bold' : 'bg-surface-3 text-muted'}`}>
                  {count}{limit ? `/${limit}` : ''}
                </span>
                {points > 0 && <span className="text-[10px] text-subtle font-mono">{points}pt</span>}
                <div className="flex-1" />
                {canAdd && col.key !== 'Completed' && (
                  <button type="button" onClick={() => onAdd(col.key)} className="btn btn-ghost btn-icon btn-sm text-subtle hover:text-accent-text" aria-label={`Add task to ${col.key}`}>
                    <Plus size={15} />
                  </button>
                )}
              </header>
              {over && <p className="px-3.5 py-1.5 text-[11px] font-semibold border-b border-line">Over the WIP limit. Finish something before pulling more.</p>}

              <Droppable droppableId={col.key}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto scroll-thin p-2.5 space-y-2.5 transition-colors duration-200 rounded-b-2xl ${snapshot.isDraggingOver ? 'bg-accent/[0.07]' : ''}`}>
                    {items.length === 0 && !snapshot.isDraggingOver && (
                      <div className="h-24 rounded-xl border border-dashed border-line-strong grid place-items-center text-xs text-subtle text-center px-4">
                        {col.hint}
                      </div>
                    )}
                    {items.map((task, index) => (
                      <Draggable key={task._id} draggableId={task._id} index={index}>
                        {(drag, dragSnap) => (
                          <div ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps} style={drag.draggableProps.style}>
                            <TaskCard task={task} dragging={dragSnap.isDragging} focusing={focusTaskId === task._id}
                              blockers={openBlockers(task, allTasks)} onOpen={() => onOpen(task)} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </motion.section>
          );
        })}
      </div>
    </DragDropContext>
  );
}
