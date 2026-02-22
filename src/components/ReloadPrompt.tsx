import { useRegisterSW } from 'virtual:pwa-register/react'
import './ReloadPrompt.css'

export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered: ' + r)
    },
    onRegisterError(error: Error) {
      console.log('SW registration error', error)
    },
  })

  const close = () => {
    setNeedRefresh(false)
  }

  return (
    <div className="ReloadPrompt-container">
      {needRefresh && (
        <div className="ReloadPrompt-toast">
          <div className="ReloadPrompt-message">
            <span>New content available, click on reload button to update.</span>
          </div>
          <button className="ReloadPrompt-toast-button" onClick={() => updateServiceWorker(true)}>Reload</button>
          <button className="ReloadPrompt-toast-button" onClick={() => close()}>Close</button>
        </div>
      )}
    </div>
  )
}
