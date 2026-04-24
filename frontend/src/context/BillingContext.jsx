import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { billingAPI } from '../services/api'
import { useAuth } from './AuthContext'

const BillingContext = createContext(null)

export function BillingProvider({ children }) {
    const { user } = useAuth()
    const [billing, setBilling] = useState(null)
    const [loading, setLoading] = useState(false)

    const refresh = useCallback(async () => {
        if (!user) return
        setLoading(true)
        try {
            const res = await billingAPI.getStatus()
            setBilling(res.data)
        } catch (e) {
            // silencieux — pas bloquant
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        if (!user) return
        refresh()
        // Rafraîchit le solde toutes les 2 minutes pour éviter les valeurs obsolètes
        const interval = setInterval(refresh, 120_000)
        return () => clearInterval(interval)
    }, [user])

    const isForfait = billing?.billing_mode === 'forfait'
    const balance = billing ? parseFloat(billing.credit_balance) : null
    const isBlocked = !isForfait && balance !== null && balance <= 0
    const isLow = !isForfait && balance !== null && balance > 0 && balance <= 20
    const isWarning = !isForfait && balance !== null && balance > 20 && balance <= 50

    return (
        <BillingContext.Provider value={{ billing, loading, refresh, isForfait, balance, isBlocked, isLow, isWarning }}>
            {children}
        </BillingContext.Provider>
    )
}

export function useBilling() {
    return useContext(BillingContext)
}
