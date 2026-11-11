import { Keyboard } from 'lucide-react';
import Modal from './ui/Modal';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const GROUPS = [
  {
    title: 'Anywhere',
    rows: [
      [[isMac ? '⌘' : 'Ctrl', 'K'], 'Command palette and search'],
      [['G', 'D'], 'Go to dashboard'],
      [['G', 'P'], 'Go to projects'],
      [['G', 'T'], 'Go to team'],
      [['?'], 'Show this help']
    ]
  },
  {
    title: 'On a project',
    rows: [
      [['N'], 'New task (admins)'],
      [['Q'], 'Quick add (admins)'],
      [['/'], 'Search tasks'],
      [['1'], 'Board view'],
      [['2'], 'List view'],
      [['3'], 'Calendar view'],
      [['A'], 'Toggle activity panel']
    ]
  },
  {
    title: 'In a comment',
    rows: [
      [['@'], 'Mention a teammate'],
      [[isMac ? '⌘' : 'Ctrl', '↵'], 'Send comment']
    ]
  }
];

export default function ShortcutsHelp({ onClose }) {
  return (
    <Modal onClose={onClose} size="md" title="Keyboard shortcuts" subtitle="Move faster without touching the mouse" icon={<Keyboard size={18} />}>
      <div className="space-y-5">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <p className="label">{g.title}</p>
            <div className="rounded-xl border border-line divide-y divide-line">
              {g.rows.map(([keys, label]) => (
                <div key={label} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
                  <span className="text-muted">{label}</span>
                  <span className="flex gap-1">{keys.map((k) => <span key={k} className="kbd">{k}</span>)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
