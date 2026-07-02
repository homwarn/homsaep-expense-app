import { PurchaseModule } from './PurchaseModule'

export default function RawMaterials() {
  return (
    <PurchaseModule
      config={{
        table: 'raw_material_purchases',
        categoryTable: 'raw_material_categories',
        nameField: 'material_name',
        titleKey: 'raw_materials',
      }}
    />
  )
}
