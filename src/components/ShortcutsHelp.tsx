import { shortcutGroups } from '@/hooks/useKeyboardShortcuts'

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="shortcuts-overlay" onClick={onClose} role="dialog" aria-label="Keyboard shortcuts">
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h3>Keyboard shortcuts</h3>
          <button type="button" className="shortcuts-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="shortcuts-body">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="shortcuts-group">
              <h4>{group.title}</h4>
              {group.shortcuts.map((shortcut) => (
                <div key={shortcut.description} className="shortcuts-row">
                  <span className="shortcuts-description">{shortcut.description}</span>
                  <span className="shortcuts-keys">
                    {shortcut.keys.map((key, i) => (
                      <span key={i}>
                        {i > 0 && <span className="shortcuts-separator">+</span>}
                        <kbd>{key}</kbd>
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="shortcuts-footer">
          <span>Press <kbd>?</kbd> to toggle this panel</span>
        </div>
      </div>
    </div>
  )
}
