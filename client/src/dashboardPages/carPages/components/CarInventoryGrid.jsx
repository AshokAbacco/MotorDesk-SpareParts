import { Car } from 'lucide-react';
import InventoryGridBase from '../../components/inventory/InventoryGridBase.jsx';

export default function CarInventoryGrid(props) {
  return <InventoryGridBase {...props} placeholderIcon={Car} />;
}
