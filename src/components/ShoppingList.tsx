import { useState, useEffect, useCallback } from 'react';
import { Plus, X, ShoppingCart, Check, Loader2, Cloud, CloudOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ShoppingItem {
  id: string;
  name: string;
  is_bought: boolean;
  created_at: string;
}

const LOCAL_STORAGE_KEY = 'shopping-list';

export function ShoppingList() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load items from database or localStorage
  const loadItems = useCallback(async () => {
    if (user) {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('shopping_list')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setItems(data);
      }
      setIsLoading(false);
    } else {
      // Load from localStorage for non-logged users
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Convert old format to new format
          const converted = parsed.map((item: any) => ({
            id: item.id,
            name: item.name,
            is_bought: item.is_bought ?? false,
            created_at: item.created_at || item.addedAt || new Date().toISOString(),
          }));
          setItems(converted);
        } catch {
          // Invalid data
        }
      }
    }
  }, [user]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Save to localStorage when items change (for non-logged users)
  useEffect(() => {
    if (!user) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, user]);

  // Sync localStorage items to database when user logs in
  useEffect(() => {
    const syncLocalToCloud = async () => {
      if (user) {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          try {
            const localItems = JSON.parse(stored);
            if (localItems.length > 0) {
              setIsSyncing(true);
              // Insert local items to database
              const itemsToInsert = localItems.map((item: any) => ({
                user_id: user.id,
                name: item.name,
                is_bought: item.is_bought ?? false,
              }));
              
              await supabase.from('shopping_list').insert(itemsToInsert);
              
              // Clear localStorage after sync
              localStorage.removeItem(LOCAL_STORAGE_KEY);
              
              // Reload from database
              await loadItems();
              setIsSyncing(false);
            }
          } catch {
            setIsSyncing(false);
          }
        }
      }
    };
    
    syncLocalToCloud();
  }, [user, loadItems]);

  const addItem = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (user) {
      const { data, error } = await supabase
        .from('shopping_list')
        .insert({ user_id: user.id, name: trimmed })
        .select()
        .single();
      
      if (!error && data) {
        setItems(prev => [data, ...prev]);
      }
    } else {
      const newItem: ShoppingItem = {
        id: crypto.randomUUID(),
        name: trimmed,
        is_bought: false,
        created_at: new Date().toISOString(),
      };
      setItems(prev => [newItem, ...prev]);
    }
    
    setInputValue('');
  };

  const toggleBought = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const newBoughtState = !item.is_bought;

    if (user) {
      await supabase
        .from('shopping_list')
        .update({ is_bought: newBoughtState })
        .eq('id', id);
    }
    
    setItems(prev => prev.map(i => 
      i.id === id ? { ...i, is_bought: newBoughtState } : i
    ));
  };

  const removeItem = async (id: string) => {
    if (user) {
      await supabase.from('shopping_list').delete().eq('id', id);
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  // Sort: not bought first, then bought
  const sortedItems = [...items].sort((a, b) => {
    if (a.is_bought === b.is_bought) return 0;
    return a.is_bought ? 1 : -1;
  });

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingCart className="w-5 h-5 text-primary" />
        <h3 className="font-heading font-semibold">Twoja lista zakupów</h3>
        {user ? (
          <span title="Zsynchronizowano z chmurą">
            <Cloud className="w-4 h-4 text-success ml-1" />
          </span>
        ) : (
          <span title="Tylko lokalnie">
            <CloudOff className="w-4 h-4 text-muted-foreground ml-1" />
          </span>
        )}
        {items.length > 0 && (
          <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {items.filter(i => !i.is_bought).length}/{items.length}
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

      {/* Loading state */}
      {(isLoading || isSyncing) ? (
        <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{isSyncing ? 'Synchronizacja...' : 'Ładowanie...'}</span>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Twoja lista jest pusta. Dodaj produkty które są Ci NIEZBĘDNE w domu, skończyły się lub są przeterminowane.
        </p>
      ) : (
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {sortedItems.map((item, index) => (
            <li
              key={item.id}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg",
                "animate-in slide-in-from-top-2 duration-200",
                item.is_bought 
                  ? "bg-muted/30 opacity-60" 
                  : "bg-muted/50"
              )}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <button
                onClick={() => toggleBought(item.id)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left"
              >
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                  item.is_bought 
                    ? "bg-success border-success text-success-foreground" 
                    : "border-muted-foreground"
                )}>
                  {item.is_bought && <Check className="w-3 h-3" />}
                </div>
                <span className={cn(
                  "text-sm truncate",
                  item.is_bought && "line-through text-muted-foreground"
                )}>
                  {item.name}
                </span>
              </button>
              <button
                onClick={() => removeItem(item.id)}
                className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
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
