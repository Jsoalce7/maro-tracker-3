import { AddFoodModal } from '../nutrition/AddFoodModal';

interface FoodDatabaseModalProps {
    onClose: () => void;
    initialFoodId?: string;
}

export function FoodDatabaseModal({ onClose, initialFoodId }: FoodDatabaseModalProps) {
    return (
        <AddFoodModal
            onClose={onClose}
            mode="manage"
            initialFoodId={initialFoodId}
        />
    );
}
