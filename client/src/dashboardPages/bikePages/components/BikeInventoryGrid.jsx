import { Bike } from 'lucide-react';
import InventoryGridBase from '../../components/inventory/InventoryGridBase.jsx';

export default function BikeInventoryGrid(props) {
  return <InventoryGridBase {...props} placeholderIcon={Bike} />;
}
