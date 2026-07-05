import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'

const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const RawMaterials = lazy(() => import('@/pages/purchases/RawMaterials'))
const Drinks = lazy(() => import('@/pages/purchases/Drinks'))
const MasterData = lazy(() => import('@/pages/MasterData'))
const OtherExpenses = lazy(() => import('@/pages/expenses/OtherExpenses'))
const Revenue = lazy(() => import('@/pages/revenue/Revenue'))
const ExpenseSummary = lazy(() => import('@/pages/ExpenseSummary'))
const ProfitSummary = lazy(() => import('@/pages/ProfitSummary'))
const Reports = lazy(() => import('@/pages/Reports'))
const Users = lazy(() => import('@/pages/Users'))
const Settings = lazy(() => import('@/pages/Settings'))

const Fallback = () => (
  <div className="flex h-screen items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/raw-materials" element={<RawMaterials />} />
          <Route path="/drinks" element={<Drinks />} />
          <Route path="/master-data" element={<MasterData />} />
          <Route path="/expenses" element={<OtherExpenses />} />
          <Route path="/revenue" element={<Revenue />} />
          <Route path="/expense-summary" element={<ExpenseSummary />} />
          <Route path="/profit-summary" element={<ProfitSummary />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/users" element={<ProtectedRoute requireOwner><Users /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute requireOwner><Settings /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Suspense>
  )
}
