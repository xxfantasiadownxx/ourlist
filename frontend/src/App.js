import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const API = process.env.REACT_APP_API_URL || '';

const COLORS = [
  '#E07A5F', '#3D405B', '#81B29A', '#F2CC8F', '#8B6BAE',
  '#E8A598', '#5C8DA8', '#B5936B', '#6BAA8C', '#C47DB4'
];

const DAYS_OF_WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const RECURRENCE_LABELS = {
  none: 'One-time',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function localDateStr(date) {
  const d = date || new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

// Format total minutes as H:MM
function formatMinutes(totalMins) {
  if (!totalMins || totalMins <= 0) return null;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `0:${String(m).padStart(2, '0')}`;
  return `${h}:${String(m).padStart(2, '0')}`;
}

// Returns the next due date string (YYYY-MM-DD local time) for a task
function getNextDue(task) {
  if (task.recurrence === 'none' || !task.recurrence) return null;

  const base = task.lastCompleted ? new Date(task.lastCompleted) : new Date(task.createdAt);

  if (task.recurrence === 'daily') {
    const d = new Date(base);
    d.setDate(d.getDate() + 1);
    return localDateStr(d);
  }

  if (task.recurrence === 'weekly') {
    if (task.weekday != null) {
      const d = new Date(base);
      d.setDate(d.getDate() + 1);
      while (d.getDay() !== task.weekday) d.setDate(d.getDate() + 1);
      return localDateStr(d);
    }
    const d = new Date(base);
    d.setDate(d.getDate() + 7);
    return localDateStr(d);
  }

  if (task.recurrence === 'monthly') {
    if (!task.dueDate) {
      const d = new Date(base);
      d.setMonth(d.getMonth() + 1);
      return localDateStr(d);
    }
    const dayOfMonth = parseInt(task.dueDate);
    const d = new Date(base);
    d.setMonth(d.getMonth() + 1);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(dayOfMonth, lastDay));
    return localDateStr(d);
  }

  return null;
}

function formatDueLabel(task) {
  const due = getNextDue(task);
  if (!due) return '';
  const today = localDateStr();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = localDateStr(tomorrow);
  if (due < today) return 'Overdue';
  if (due === today) return 'Today';
  if (due === tomorrowStr) return 'Tomorrow';
  return new Date(due + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimeLabel(task) {
  if (task.recurrence === 'daily' && task.dueTime) {
    const [h, m] = task.dueTime.split(':').map(Number);
    const ampm = h >= 12 ? 'pm' : 'am';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2,'0')} ${ampm}`;
  }
  return null;
}

function formatWeekdayLabel(task) {
  if (task.recurrence === 'weekly' && task.weekday != null) return DAYS_OF_WEEK[task.weekday];
  return null;
}

function formatMonthlyLabel(task) {
  if (task.recurrence === 'monthly' && task.dueDate) {
    const d = parseInt(task.dueDate);
    const suffix = d === 1 || d === 21 || d === 31 ? 'st'
                 : d === 2 || d === 22 ? 'nd'
                 : d === 3 || d === 23 ? 'rd' : 'th';
    return `${d}${suffix}`;
  }
  return null;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── AddMemberModal ────────────────────────────────────────────────────────────
function AddMemberModal({ onAdd, onClose, existingColors, editMember }) {
  const [name, setName] = useState(editMember?.name || '');
  const [color, setColor] = useState(() => {
    if (editMember) return editMember.color;
    const unused = COLORS.find(c => !existingColors.includes(c));
    return unused || COLORS[0];
  });
  const inputRef = useRef(null);
  useEffect(() => inputRef.current?.focus(), []);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd({ id: editMember?.id || generateId(), name: trimmed, color, earnedMinutes: editMember?.earnedMinutes ?? 0 });
    onClose();
  }

  return (
    <Modal title={editMember ? 'Edit member' : 'Add member'} onClose={onClose}>
      <div className="form-group">
        <label>Name</label>
        <input
          ref={inputRef}
          className="form-input"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Family member's name"
          maxLength={24}
        />
      </div>
      <div className="form-group">
        <label>Color</label>
        <div className="color-picker">
          {COLORS.map(c => (
            <button
              key={c}
              className={`color-swatch${color === c ? ' selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={!name.trim()}>
          {editMember ? 'Save' : 'Add'}
        </button>
      </div>
    </Modal>
  );
}

// ── AddTaskModal ──────────────────────────────────────────────────────────────
function AddTaskModal({ members, defaultMemberId, onAdd, onClose, editTask }) {
  const [title, setTitle] = useState(editTask?.title || '');
  const [assignee, setAssignee] = useState(editTask?.assignee || defaultMemberId || (members[0]?.id ?? ''));
  const [recurrence, setRecurrence] = useState(editTask?.recurrence || 'none');
  const [dueDate, setDueDate] = useState(editTask?.dueDate || '');
  const [dueTime, setDueTime] = useState(editTask?.dueTime || '');
  const [weekday, setWeekday] = useState(editTask?.weekday ?? '');
  const [notes, setNotes] = useState(editTask?.notes || '');
  const [earnsTime, setEarnsTime] = useState(editTask?.earnMinutes > 0 ? true : false);
  const [earnMinutes, setEarnMinutes] = useState(editTask?.earnMinutes || '');
  const inputRef = useRef(null);
  useEffect(() => inputRef.current?.focus(), []);

  function submit() {
    const trimmed = title.trim();
    if (!trimmed || !assignee) return;
    const task = {
      id: editTask?.id || generateId(),
      title: trimmed,
      assignee,
      recurrence,
      dueDate: recurrence === 'monthly' ? dueDate : '',
      dueTime: recurrence === 'daily' ? dueTime : '',
      weekday: recurrence === 'weekly' && weekday !== '' ? parseInt(weekday) : null,
      notes: notes.trim(),
      earnMinutes: earnsTime && earnMinutes ? parseInt(earnMinutes) : 0,
      completed: false,
      completedAt: null,
      lastCompleted: editTask?.lastCompleted || null,
      createdAt: editTask?.createdAt || new Date().toISOString(),
      order: editTask?.order ?? Date.now(),
    };
    onAdd(task);
    onClose();
  }

  return (
    <Modal title={editTask ? 'Edit task' : 'Add task'} onClose={onClose}>
      <div className="form-group">
        <label>Task</label>
        <input
          ref={inputRef}
          className="form-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="What needs to be done?"
          maxLength={80}
        />
      </div>

      {members.length > 1 && (
        <div className="form-group">
          <label>Assigned to</label>
          <div className="assignee-picker">
            {members.map(m => (
              <button
                key={m.id}
                className={`assignee-chip${assignee === m.id ? ' selected' : ''}`}
                style={assignee === m.id
                  ? { background: m.color, color: '#fff', borderColor: m.color }
                  : { borderColor: m.color, color: m.color }}
                onClick={() => setAssignee(m.id)}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Frequency</label>
        <div className="recurrence-picker">
          {Object.entries(RECURRENCE_LABELS).map(([val, lbl]) => (
            <button
              key={val}
              className={`recurrence-chip${recurrence === val ? ' selected' : ''}`}
              onClick={() => setRecurrence(val)}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {recurrence === 'daily' && (
        <div className="form-group">
          <label>Time <span className="optional">(optional)</span></label>
          <input type="time" className="form-input" value={dueTime} onChange={e => setDueTime(e.target.value)} />
        </div>
      )}

      {recurrence === 'weekly' && (
        <div className="form-group">
          <label>Day of week <span className="optional">(optional)</span></label>
          <div className="weekday-picker">
            {DAYS_OF_WEEK.map((day, idx) => (
              <button
                key={day}
                className={`weekday-chip${String(weekday) === String(idx) ? ' selected' : ''}`}
                onClick={() => setWeekday(String(weekday) === String(idx) ? '' : String(idx))}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}

      {recurrence === 'monthly' && (
        <div className="form-group">
          <label>Day of month <span className="optional">(optional)</span></label>
          <select className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)}>
            <option value="">— any day —</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label>Notes <span className="optional">(optional)</span></label>
        <textarea
          className="form-input form-textarea"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any extra details…"
          rows={2}
          maxLength={200}
        />
      </div>

      {/* Time earning */}
      <div className="form-group">
        <label>Earn time</label>
        <div className="earn-time-row">
          <button
            className={`earn-toggle${earnsTime ? ' on' : ''}`}
            onClick={() => { setEarnsTime(!earnsTime); if (earnsTime) setEarnMinutes(''); }}
            type="button"
          >
            <span className="earn-toggle-knob" />
          </button>
          <span className="earn-toggle-label">{earnsTime ? 'Yes — this task earns time' : 'No'}</span>
        </div>
        {earnsTime && (
          <div className="earn-minutes-row">
            <input
              type="number"
              className="form-input earn-minutes-input"
              value={earnMinutes}
              onChange={e => setEarnMinutes(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              min="1"
              max="480"
            />
            <span className="earn-minutes-unit">minutes</span>
          </div>
        )}
      </div>

      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={!title.trim() || !assignee || (earnsTime && !earnMinutes)}>
          {editTask ? 'Save' : 'Add task'}
        </button>
      </div>
    </Modal>
  );
}

// ── ExchangeTimeModal ─────────────────────────────────────────────────────────
function ExchangeTimeModal({ member, onExchange, onClose }) {
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef(null);
  useEffect(() => inputRef.current?.focus(), []);

  const available = member.earnedMinutes || 0;
  const requested = parseInt(inputVal) || 0;
  const invalid = requested <= 0 || requested > available;

  function submit() {
    if (invalid) return;
    onExchange(member.id, requested);
    onClose();
  }

  return (
    <Modal title="Exchange time" onClose={onClose}>
      <div className="exchange-balance">
        <span className="exchange-balance-label">Available</span>
        <span className="exchange-balance-amount" style={{ color: member.color }}>
          {formatMinutes(available)}
        </span>
      </div>

      <div className="form-group">
        <label>How many minutes to exchange?</label>
        <div className="earn-minutes-row">
          <input
            ref={inputRef}
            type="number"
            className="form-input earn-minutes-input"
            value={inputVal}
            onChange={e => setInputVal(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && !invalid && submit()}
            placeholder="0"
            min="1"
            max={available}
          />
          <span className="earn-minutes-unit">minutes</span>
        </div>
        {requested > available && (
          <p className="exchange-error">Not enough time available</p>
        )}
        {requested > 0 && requested <= available && (
          <p className="exchange-preview">
            Remaining after exchange: <strong>{formatMinutes(available - requested)}</strong>
          </p>
        )}
      </div>

      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={invalid}>
          Exchange
        </button>
      </div>
    </Modal>
  );
}

// ── TaskItem ──────────────────────────────────────────────────────────────────
function TaskItem({ task, member, onToggle, onEdit, onDelete, onReorder, isFirst, isLast }) {
  const dueLabel = formatDueLabel(task);
  const timeLabel = formatTimeLabel(task);
  const weekdayLabel = formatWeekdayLabel(task);
  const monthlyLabel = formatMonthlyLabel(task);
  const isOverdue = dueLabel === 'Overdue';
  const hasMeta = task.recurrence !== 'none' || dueLabel || timeLabel || weekdayLabel || monthlyLabel || task.earnMinutes > 0;

  return (
    <div className={`task-item${task.completed ? ' completed' : ''}`}>
      <button
        className="task-check"
        onClick={() => onToggle(task.id)}
        style={{
          borderColor: task.completed ? member.color : undefined,
          background: task.completed ? member.color : undefined,
        }}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.completed && (
          <svg viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 5l3.5 3.5L11 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      <div className="task-body" onClick={() => !task.completed && onEdit(task)}>
        <div className="task-title">{task.title}</div>
        {task.notes && <div className="task-notes">{task.notes}</div>}
        {hasMeta && (
          <div className="task-meta">
            {task.recurrence !== 'none' && (
              <span className="task-badge recurrence">{RECURRENCE_LABELS[task.recurrence]}</span>
            )}
            {weekdayLabel && <span className="task-badge weekday">{weekdayLabel}</span>}
            {monthlyLabel && <span className="task-badge weekday">{monthlyLabel}</span>}
            {timeLabel && <span className="task-badge time">{timeLabel}</span>}
            {dueLabel && (
              <span className={`task-badge due${isOverdue ? ' overdue' : ''}`}>{dueLabel}</span>
            )}
            {task.earnMinutes > 0 && (
              <span className="task-badge earn">+{formatMinutes(task.earnMinutes)}</span>
            )}
          </div>
        )}
      </div>

      {!task.completed && (
        <div className="task-actions">
          <div className="reorder-btns">
            <button className="reorder-btn" onClick={() => onReorder(task.id, -1)} disabled={isFirst} aria-label="Move up">↑</button>
            <button className="reorder-btn" onClick={() => onReorder(task.id, 1)} disabled={isLast} aria-label="Move down">↓</button>
          </div>
          <button className="task-delete" onClick={() => onDelete(task.id)} aria-label="Delete task">✕</button>
        </div>
      )}
    </div>
  );
}

// ── MemberView ────────────────────────────────────────────────────────────────
function MemberView({ member, tasks, allMembers, onToggleTask, onAddTask, onEditTask, onDeleteTask, onReorderTask, onExchangeTime }) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showExchange, setShowExchange] = useState(false);

  const activeTasks = tasks
    .filter(t => !t.completed)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const completedTasks = tasks
    .filter(t => t.completed)
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  const earnedMinutes = member.earnedMinutes || 0;
  const earnedLabel = formatMinutes(earnedMinutes);

  return (
    <div className="member-view">
      <div className="member-header">
        <div className="member-avatar" style={{ background: member.color }}>
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div className="member-info">
          <h1 className="member-name">{member.name}</h1>
          <div className="member-meta-row">
            <p className="member-task-count">
              {activeTasks.length === 0 ? 'All done!' : `${activeTasks.length} task${activeTasks.length !== 1 ? 's' : ''}`}
            </p>
            {earnedLabel && (
              <span className="member-earned" style={{ color: member.color }}>
                {earnedLabel} earned
              </span>
            )}
          </div>
        </div>
        <button
          className="add-task-btn"
          onClick={() => setShowAddTask(true)}
          style={{ background: member.color }}
          aria-label="Add task"
        >
          +
        </button>
      </div>

      <div className="task-list">
        {activeTasks.length === 0 && completedTasks.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <p>No tasks yet</p>
            <button className="btn-primary" style={{ background: member.color }} onClick={() => setShowAddTask(true)}>
              Add first task
            </button>
          </div>
        )}

        {activeTasks.map((task, idx) => (
          <TaskItem
            key={task.id}
            task={task}
            member={member}
            onToggle={onToggleTask}
            onEdit={t => setEditingTask(t)}
            onDelete={onDeleteTask}
            onReorder={onReorderTask}
            isFirst={idx === 0}
            isLast={idx === activeTasks.length - 1}
          />
        ))}

        {completedTasks.length > 0 && (
          <div className="completed-section">
            <div className="completed-divider">Completed</div>
            {completedTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                member={member}
                onToggle={onToggleTask}
                onEdit={() => {}}
                onDelete={onDeleteTask}
                onReorder={() => {}}
                isFirst={true}
                isLast={true}
              />
            ))}
          </div>
        )}

        {/* Exchange button — only shown when there's time to exchange */}
        {earnedMinutes > 0 && (
          <div className="exchange-footer">
            <button
              className="exchange-btn"
              style={{ borderColor: member.color, color: member.color }}
              onClick={() => setShowExchange(true)}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
              </svg>
              Exchange earned time
            </button>
          </div>
        )}
      </div>

      {showAddTask && (
        <AddTaskModal
          members={allMembers}
          defaultMemberId={member.id}
          onAdd={onAddTask}
          onClose={() => setShowAddTask(false)}
        />
      )}
      {editingTask && (
        <AddTaskModal
          members={allMembers}
          defaultMemberId={member.id}
          onAdd={onEditTask}
          onClose={() => setEditingTask(null)}
          editTask={editingTask}
        />
      )}
      {showExchange && (
        <ExchangeTimeModal
          member={member}
          onExchange={onExchangeTime}
          onClose={() => setShowExchange(false)}
        />
      )}
    </div>
  );
}

// ── SettingsPage ──────────────────────────────────────────────────────────────
function SettingsPage({ members, tasks, onAddMember, onEditMember, onDeleteMember, onReorderMember }) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  function handleDelete(member) {
    const taskCount = tasks.filter(t => t.assignee === member.id).length;
    const msg = taskCount > 0
      ? `Remove ${member.name}? This will also delete their ${taskCount} task${taskCount !== 1 ? 's' : ''}.`
      : `Remove ${member.name}?`;
    if (window.confirm(msg)) onDeleteMember(member.id);
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Members</h1>
        <button className="settings-add-btn" onClick={() => setShowAddMember(true)}>+ Add</button>
      </div>

      <div className="member-list">
        {members.map((m, idx) => (
          <div key={m.id} className="member-row">
            <div className="member-row-reorder">
              <button className="reorder-btn" onClick={() => onReorderMember(m.id, -1)} disabled={idx === 0}>↑</button>
              <button className="reorder-btn" onClick={() => onReorderMember(m.id, 1)} disabled={idx === members.length - 1}>↓</button>
            </div>
            <div className="member-row-avatar" style={{ background: m.color }}>
              {m.name.charAt(0).toUpperCase()}
            </div>
            <div className="member-row-info">
              <span className="member-row-name">{m.name}</span>
              <span className="member-row-tasks">
                {tasks.filter(t => t.assignee === m.id && !t.completed).length} active tasks
                {m.earnedMinutes > 0 && ` · ${formatMinutes(m.earnedMinutes)} earned`}
              </span>
            </div>
            <div className="member-row-actions">
              <button className="member-edit-btn" onClick={() => setEditingMember(m)}>Edit</button>
              <button className="member-delete-btn" onClick={() => handleDelete(m)}>Remove</button>
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <div className="settings-empty">No members yet. Add one to get started.</div>
        )}
      </div>

      {showAddMember && (
        <AddMemberModal
          onAdd={onAddMember}
          onClose={() => setShowAddMember(false)}
          existingColors={members.map(m => m.color)}
        />
      )}
      {editingMember && (
        <AddMemberModal
          onAdd={onEditMember}
          onClose={() => setEditingMember(null)}
          existingColors={members.filter(m => m.id !== editingMember.id).map(m => m.color)}
          editMember={editingMember}
        />
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/data`)
      .then(r => r.json())
      .then(data => {
        setMembers(data.members || []);
        setTasks(data.tasks || []);
        if (data.members?.length > 0) setActiveTab(data.members[0].id);
        setLoaded(true);
      })
      .catch(() => {
        try {
          const local = JSON.parse(localStorage.getItem('ourlist') || '{}');
          setMembers(local.members || []);
          setTasks(local.tasks || []);
          if (local.members?.length > 0) setActiveTab(local.members[0].id);
        } catch {}
        setLoaded(true);
      });
  }, []);

  const persistData = useCallback((m, t) => {
    const data = { members: m, tasks: t };
    localStorage.setItem('ourlist', JSON.stringify(data));
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      fetch(`${API}/api/data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(() => {});
    }, 500);
  }, []);

  // Task lifecycle rules:
  // - One-time:  delete 4 hours after completion
  // - Daily:     hide 4 hours after completion; reset at midnight (next calendar day)
  // - Weekly:    hide 4 hours after completion; reset at midnight on the due weekday
  // - Monthly:   hide 4 hours after completion; reset at midnight on the due day-of-month
  useEffect(() => {
    if (!loaded) return;
    const check = () => {
      const now = new Date();
      const todayStr = localDateStr(now);
      const FOUR_HOURS = 4 * 60 * 60 * 1000;

      let changed = false;
      const updated = tasks.map(t => {
        if (!t.completed || !t.completedAt) return t;

        const age = now - new Date(t.completedAt);

        // One-time: hard delete after 4 hours
        if (t.recurrence === 'none') {
          if (age >= FOUR_HOURS) { changed = true; return null; }
          return t;
        }

        // Recurring: keep showing as completed for 4 hours regardless
        if (age < FOUR_HOURS) return t;

        // Past 4 hours — check if midnight on the due date has arrived
        const nextDue = getNextDue(t);

        // No due date configured — reset immediately after 4-hour window
        if (!nextDue) {
          changed = true;
          return { ...t, completed: false, completedAt: null };
        }

        // Reset once we're on or past the due date (midnight has passed)
        if (nextDue <= todayStr) {
          changed = true;
          return { ...t, completed: false, completedAt: null };
        }

        // Due date still in the future — keep hidden
        return t;
      }).filter(Boolean);

      if (changed) {
        setTasks(updated);
        persistData(members, updated);
      }
    };

    check();
    const interval = setInterval(check, 60 * 1000);
    return () => clearInterval(interval);
  }, [tasks, members, loaded, persistData]);

  function addMember(member) {
    const m = { earnedMinutes: 0, ...member };
    const updated = [...members, m];
    setMembers(updated);
    setActiveTab(m.id);
    persistData(updated, tasks);
  }

  function editMember(updatedMember) {
    const updated = members.map(m => m.id === updatedMember.id ? { ...m, ...updatedMember } : m);
    setMembers(updated);
    persistData(updated, tasks);
  }

  function deleteMember(memberId) {
    const updatedMembers = members.filter(m => m.id !== memberId);
    const updatedTasks = tasks.filter(t => t.assignee !== memberId);
    setMembers(updatedMembers);
    setTasks(updatedTasks);
    if (activeTab === memberId) setActiveTab(updatedMembers[0]?.id ?? 'settings');
    persistData(updatedMembers, updatedTasks);
  }

  function reorderMember(memberId, direction) {
    const idx = members.findIndex(m => m.id === memberId);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= members.length) return;
    const updated = [...members];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setMembers(updated);
    persistData(updated, tasks);
  }

  function addTask(task) {
    const updated = [...tasks, task];
    setTasks(updated);
    persistData(members, updated);
  }

  function editTask(updatedTask) {
    const updated = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    setTasks(updated);
    persistData(members, updated);
  }

  function deleteTask(taskId) {
    const updated = tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    persistData(members, updated);
  }

  function toggleTask(taskId) {
    const now = new Date().toISOString();
    let updatedMembers = members;

    const updatedTasks = tasks.map(t => {
      if (t.id !== taskId) return t;
      if (t.completed) {
        // Unchecking — if it had earned time, take it back
        if (t.earnMinutes > 0) {
          updatedMembers = updatedMembers.map(m =>
            m.id === t.assignee
              ? { ...m, earnedMinutes: Math.max(0, (m.earnedMinutes || 0) - t.earnMinutes) }
              : m
          );
        }
        return { ...t, completed: false, completedAt: null };
      } else {
        // Checking — award time if applicable
        if (t.earnMinutes > 0) {
          updatedMembers = updatedMembers.map(m =>
            m.id === t.assignee
              ? { ...m, earnedMinutes: (m.earnedMinutes || 0) + t.earnMinutes }
              : m
          );
        }
        return { ...t, completed: true, completedAt: now, lastCompleted: now };
      }
    });

    setTasks(updatedTasks);
    setMembers(updatedMembers);
    persistData(updatedMembers, updatedTasks);
  }

  function exchangeTime(memberId, minutes) {
    const updated = members.map(m =>
      m.id === memberId
        ? { ...m, earnedMinutes: Math.max(0, (m.earnedMinutes || 0) - minutes) }
        : m
    );
    setMembers(updated);
    persistData(updated, tasks);
  }

  function reorderTask(taskId, direction) {
    const memberTasks = tasks
      .filter(t => t.assignee === activeTab && !t.completed)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const idx = memberTasks.findIndex(t => t.id === taskId);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= memberTasks.length) return;
    const taskA = memberTasks[idx];
    const taskB = memberTasks[newIdx];
    const updated = tasks.map(t => {
      if (t.id === taskA.id) return { ...t, order: taskB.order ?? newIdx };
      if (t.id === taskB.id) return { ...t, order: taskA.order ?? idx };
      return t;
    });
    setTasks(updated);
    persistData(members, updated);
  }

  const activeMember = members.find(m => m.id === activeTab);

  if (!loaded) {
    return (
      <div className="app loading">
        <div className="loading-mark">OurList</div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="app onboarding">
        <div className="onboarding-content">
          <h1 className="app-wordmark">OurList</h1>
          <p className="onboarding-sub">A shared to-do list for the whole family.</p>
          <button className="btn-primary large" onClick={() => setActiveTab('settings')}>
            Get started
          </button>
        </div>
        {activeTab === 'settings' && (
          <SettingsPage
            members={members}
            tasks={tasks}
            onAddMember={addMember}
            onEditMember={editMember}
            onDeleteMember={deleteMember}
            onReorderMember={reorderMember}
          />
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="tab-bar">
        <div className="tab-bar-inner">
          <div className="tabs-scroll">
            {members.map(m => (
              <button
                key={m.id}
                className={`tab${activeTab === m.id ? ' active' : ''}`}
                onClick={() => setActiveTab(m.id)}
                style={activeTab === m.id ? { '--tab-color': m.color } : {}}
              >
                <span className="tab-dot" style={{ background: m.color }} />
                <span className="tab-label">{m.name}</span>
              </button>
            ))}
          </div>
          <button
            className={`tab-settings${activeTab === 'settings' ? ' active' : ''}`}
            onClick={() => setActiveTab('settings')}
            aria-label="Settings"
            title="Manage members"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"/>
            </svg>
          </button>
        </div>
        {activeMember && activeTab !== 'settings' && (
          <div className="tab-indicator" style={{ background: activeMember.color }} />
        )}
        {activeTab === 'settings' && (
          <div className="tab-indicator" style={{ background: 'var(--text-muted)' }} />
        )}
      </nav>

      {activeMember && activeTab !== 'settings' && (
        <MemberView
          key={activeMember.id}
          member={activeMember}
          tasks={tasks.filter(t => t.assignee === activeTab)}
          allMembers={members}
          onToggleTask={toggleTask}
          onAddTask={addTask}
          onEditTask={editTask}
          onDeleteTask={deleteTask}
          onReorderTask={reorderTask}
          onExchangeTime={exchangeTime}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsPage
          members={members}
          tasks={tasks}
          onAddMember={addMember}
          onEditMember={editMember}
          onDeleteMember={deleteMember}
          onReorderMember={reorderMember}
        />
      )}
    </div>
  );
}
