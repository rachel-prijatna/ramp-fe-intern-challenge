import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee, Transaction } from "./utils/types"

export function App() {
  const { data: employees, ...employeeUtils } = useEmployees()
  const { data: paginatedTransactions, ...paginatedTransactionsUtils } = usePaginatedTransactions()
  const { data: transactionsByEmployee, ...transactionsByEmployeeUtils } = useTransactionsByEmployee()
  const [isLoading, setIsLoading] = useState(false)

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    if (paginatedTransactions?.data) {
      setTransactions(prev => {
        const existingIds = new Set(prev.map(txn => txn.id))
        const newTxns = paginatedTransactions.data.filter(txn => !existingIds.has(txn.id))
        return [...prev, ...newTxns]
      })
    }
  }, [paginatedTransactions])

  useEffect(() => {
    if (transactionsByEmployee && selectedEmployeeId !== null) {
      setTransactions(transactionsByEmployee)
    }
  }, [transactionsByEmployee, selectedEmployeeId])

  const handleToggleApproval = useCallback((transactionId: string) => {
    setTransactions(prev =>
      prev.map(txn =>
        txn.id === transactionId ? { ...txn, approved: !txn.approved } : txn
      )
    )
  }, [])

  const loadAllTransactions = useCallback(async () => {
    setIsLoading(true)
    setSelectedEmployeeId(null)
    transactionsByEmployeeUtils.invalidateData()

    await employeeUtils.fetchAll()
    await paginatedTransactionsUtils.fetchAll()

    setIsLoading(false)
  }, [employeeUtils, paginatedTransactionsUtils, transactionsByEmployeeUtils])

  const loadTransactionsByEmployee = useCallback(
    async (employeeId: string) => {
      setSelectedEmployeeId(employeeId)
      paginatedTransactionsUtils.invalidateData()
      await transactionsByEmployeeUtils.fetchById(employeeId)
    },
    [paginatedTransactionsUtils, transactionsByEmployeeUtils]
  )

  useEffect(() => {
    if (employees === null && !employeeUtils.loading) {
      loadAllTransactions()
    }
  }, [employeeUtils.loading, employees, loadAllTransactions])

  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

        <InputSelect<Employee>
          isLoading={employeeUtils.loading}
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          onChange={async (newValue) => {
            if (newValue === null || newValue.id === EMPTY_EMPLOYEE.id) {
              await loadAllTransactions()
            } else {
              await loadTransactionsByEmployee(newValue.id)
            }
          }}
        />

        <div className="RampBreak--l" />

        <div className="RampGrid">
          <Transactions
            transactions={transactions}
            onToggleApproval={handleToggleApproval}
          />

          {selectedEmployeeId === null &&
            paginatedTransactions?.nextPage != null && (
              <button
                className="RampButton"
                disabled={paginatedTransactionsUtils.loading || isLoading}
                onClick={loadAllTransactions}
              >
                View More
              </button>
            )}
        </div>
      </main>
    </Fragment>
  )
}
