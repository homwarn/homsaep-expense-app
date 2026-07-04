import { PurchaseModule } from './PurchaseModule'

export default function Drinks() {
  return (
    <PurchaseModule
      config={{
        table: 'drink_purchases',
        categoryTable: 'drink_categories',
        itemTable: 'drinks',
        nameField: 'drink_name',
        titleKey: 'drinks',
      }}
    />
  )
}
