import TransactionForm from '../../../components/TransactionForm'
import TransactionList from '../../../components/TransactionList'

export default function TransactionsPage({ params }: { params: { accountId: string } }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Transactions for Account {params.accountId}</h1>
      <TransactionList accountId={params.accountId} />
      <TransactionForm />
    </div>
  )
}
