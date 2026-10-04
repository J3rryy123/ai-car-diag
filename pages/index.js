import AuthGate from '../components/AuthGate'
import KFZDiagnosePlatform from '../components/KFZDiagnosePlatform'

export default function Home() {
  return (
    <AuthGate>
      <KFZDiagnosePlatform />
    </AuthGate>
  )
}
