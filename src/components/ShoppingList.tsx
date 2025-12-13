import { useState, useEffect } from 'react';
import { Plus, X, ShoppingCart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ShoppingItem {
  id: string;
  name: string;
  addedAt: number;
}

const STORAGE_KEY = 'shopping-list';

export function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [inputValue, setInputValue] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch {
        // Invalid data, start fresh
      }
    }
  }, []);

  // Save to localStorage when items change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const newItem: ShoppingItem = {
      id: crypto.randomUUID(),
      name: trimmed,
      addedAt: Date.now(),
    };

    // Add to the beginning of the list
    setItems(prev => [newItem, ...prev]);
    setInputValue('');
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingCart className="w-5 h-5 text-primary" />
        <h3 className="font-heading font-semibold">Twoja lista zakupów</h3>
        {items.length > 0 && (
          <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>

      {/* Add item input */}
      <div className="flex gap-2 mb-4">
        <Input
          type="text"
          placeholder="Wpisz produkt..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button
          size="sm"
          onClick={addItem}
          disabled={!inputValue.trim()}
          className="flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Dodaj</span>
        </Button>
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Twoja lista jest pusta. Dodaj produkty podczas przeglądania półek!
        </p>
      ) : (
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {items.map((item, index) => (
            <li
              key={item.id}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg bg-muted/50",
                "animate-in slide-in-from-top-2 duration-200",
                index === 0 && "bg-primary/10"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="text-sm truncate flex-1 mr-2">{item.name}</span>
              <button
                onClick={() => removeItem(item.id)}
                className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Usuń ${item.name}`}
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
