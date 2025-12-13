import { useState } from 'react';
import { useGlobalFlashcards, type GlobalFlashcard, type NewGlobalFlashcard } from '@/hooks/useGlobalFlashcards';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import flashcardsData from '@/data/flashcards-import.json';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Layers, 
  Loader2,
  Clock,
  Crown,
  Search,
  ChevronDown,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const DIFFICULTIES = [
  { value: 'easy', label: 'Łatwe', color: 'bg-success/10 text-success' },
  { value: 'medium', label: 'Średnie', color: 'bg-warning/10 text-warning' },
  { value: 'hard', label: 'Trudne', color: 'bg-destructive/10 text-destructive' },
];

const TIME_UNITS = [
  { value: 'minutes', label: 'minuty' },
  { value: 'hours', label: 'godziny' },
];

const defaultFormData: NewGlobalFlashcard = {
  category: '',
  category2: null,
  task: '',
  comment: '',
  difficulty: 'medium',
  time_estimate: 10,
  time_unit: 'minutes',
  is_timed_task: true,
  is_premium: false,
};

export function FlashcardManager() {
  const { flashcards, isLoading, addFlashcard, updateFlashcard, deleteFlashcard } = useGlobalFlashcards();
  const { categories } = useCategories();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFlashcard, setSelectedFlashcard] = useState<GlobalFlashcard | null>(null);
  const [formData, setFormData] = useState<NewGlobalFlashcard>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);

  const filteredFlashcards = flashcards.filter((flashcard) => {
    const matchesSearch = flashcard.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flashcard.comment.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || flashcard.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAddModal = () => {
    setFormData({
      ...defaultFormData,
      category: categories[0]?.name || '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (flashcard: GlobalFlashcard) => {
    setSelectedFlashcard(flashcard);
    setFormData({
      category: flashcard.category,
      category2: flashcard.category2 || null,
      task: flashcard.task,
      comment: flashcard.comment,
      difficulty: flashcard.difficulty,
      time_estimate: flashcard.time_estimate,
      time_unit: flashcard.time_unit,
      is_timed_task: flashcard.is_timed_task,
      is_premium: flashcard.is_premium,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteDialog = (flashcard: GlobalFlashcard) => {
    setSelectedFlashcard(flashcard);
    setIsDeleteDialogOpen(true);
  };

  const handleAddFlashcard = async () => {
    if (!formData.task.trim() || !formData.category) return;
    setIsSubmitting(true);
    const success = await addFlashcard(formData);
    setIsSubmitting(false);
    if (success) {
      setIsAddModalOpen(false);
      setFormData(defaultFormData);
    }
  };

  const handleUpdateFlashcard = async () => {
    if (!selectedFlashcard || !formData.task.trim()) return;
    setIsSubmitting(true);
    const success = await updateFlashcard(selectedFlashcard.id, formData);
    setIsSubmitting(false);
    if (success) {
      setIsEditModalOpen(false);
      setSelectedFlashcard(null);
    }
  };

  const handleDeleteFlashcard = async () => {
    if (!selectedFlashcard) return;
    setIsSubmitting(true);
    const success = await deleteFlashcard(selectedFlashcard.id);
    setIsSubmitting(false);
    if (success) {
      setIsDeleteDialogOpen(false);
      setSelectedFlashcard(null);
    }
  };

  const { toast } = useToast();

  const handleImportFlashcards = async () => {
    if (!confirm('Czy na pewno chcesz zaimportować 600 fiszek? To usunie wszystkie istniejące fiszki i zastąpi je nowymi.')) {
      return;
    }
    
    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-flashcards', {
        body: { flashcards: flashcardsData }
      });

      if (error) throw error;

      toast({
        title: 'Sukces!',
        description: data.message || 'Fiszki zostały zaimportowane',
      });

      // Refresh flashcards list
      window.location.reload();
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Błąd importu',
        description: error.message || 'Nie udało się zaimportować fiszek',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.icon || '📦';
  };

  const getDifficultyInfo = (difficulty: string) => {
    return DIFFICULTIES.find(d => d.value === difficulty) || DIFFICULTIES[1];
  };

  const FlashcardForm = () => (
    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
      <div className="space-y-2">
        <Label htmlFor="flashcard-category">Kategoria główna</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => setFormData({ ...formData, category: value })}
        >
          <SelectTrigger id="flashcard-category">
            <SelectValue placeholder="Wybierz kategorię" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.name}>
                <span className="flex items-center gap-2">
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="flashcard-category2">Druga kategoria (opcjonalna)</Label>
        <Select
          value={formData.category2 || "none"}
          onValueChange={(value) => setFormData({ ...formData, category2: value === "none" ? null : value })}
        >
          <SelectTrigger id="flashcard-category2">
            <SelectValue placeholder="Brak drugiej kategorii" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">Brak drugiej kategorii</span>
            </SelectItem>
            {categories.filter(c => c.name !== formData.category).map((category) => (
              <SelectItem key={category.id} value={category.name}>
                <span className="flex items-center gap-2">
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="flashcard-task">Zadanie</Label>
        <Textarea
          id="flashcard-task"
          value={formData.task}
          onChange={(e) => setFormData({ ...formData, task: e.target.value })}
          placeholder="Opisz zadanie do wykonania..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="flashcard-comment">Komentarz motywacyjny</Label>
        <Textarea
          id="flashcard-comment"
          value={formData.comment}
          onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
          placeholder="Śmieszny lub motywujący komentarz..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="flashcard-difficulty">Trudność</Label>
        <Select
          value={formData.difficulty}
          onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
        >
          <SelectTrigger id="flashcard-difficulty">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTIES.map((difficulty) => (
              <SelectItem key={difficulty.value} value={difficulty.value}>
                {difficulty.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="flashcard-time">Czas</Label>
          <Input
            id="flashcard-time"
            type="number"
            min={1}
            value={formData.time_estimate}
            onChange={(e) => setFormData({ ...formData, time_estimate: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="flashcard-time-unit">Jednostka</Label>
          <Select
            value={formData.time_unit}
            onValueChange={(value) => setFormData({ ...formData, time_unit: value })}
          >
            <SelectTrigger id="flashcard-time-unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_UNITS.map((unit) => (
                <SelectItem key={unit.value} value={unit.value}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="flashcard-timed">Zadanie na czas</Label>
        <Switch
          id="flashcard-timed"
          checked={formData.is_timed_task}
          onCheckedChange={(checked) => setFormData({ ...formData, is_timed_task: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-warning" />
          <Label htmlFor="flashcard-premium">Tylko Premium</Label>
        </div>
        <Switch
          id="flashcard-premium"
          checked={formData.is_premium}
          onCheckedChange={(checked) => setFormData({ ...formData, is_premium: checked })}
        />
      </div>
    </div>
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Fiszki globalne</h3>
                <p className="text-sm text-muted-foreground">
                  {flashcards.length} fiszek
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAddModal();
                }} 
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Dodaj
              </Button>
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4 border-t border-border">
            {/* Filters */}
            <div className="flex gap-3 pt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj fiszek..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Kategoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      <span className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

      {isLoading ? (
        <div className="card-flat p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredFlashcards.length === 0 ? (
        <div className="card-flat p-8 text-center">
          <p className="text-muted-foreground">
            {flashcards.length === 0 ? 'Brak fiszek' : 'Brak wyników wyszukiwania'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {filteredFlashcards.map((flashcard) => {
            const difficultyInfo = getDifficultyInfo(flashcard.difficulty);
            return (
              <div key={flashcard.id} className="card-flat p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-lg">{getCategoryIcon(flashcard.category)}</span>
                      <span className="text-sm text-muted-foreground">{flashcard.category}</span>
                      {flashcard.category2 && (
                        <>
                          <span className="text-muted-foreground">+</span>
                          <span className="text-lg">{getCategoryIcon(flashcard.category2)}</span>
                          <span className="text-sm text-muted-foreground">{flashcard.category2}</span>
                        </>
                      )}
                      <Badge className={cn("text-xs", difficultyInfo.color)} variant="secondary">
                        {difficultyInfo.label}
                      </Badge>
                      {flashcard.is_premium && (
                        <Badge className="bg-warning/10 text-warning text-xs" variant="secondary">
                          <Crown className="h-3 w-3 mr-1" />
                          Premium
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium mb-1 line-clamp-2">{flashcard.task}</p>
                    {flashcard.comment && (
                      <p className="text-sm text-muted-foreground line-clamp-1 italic">
                        "{flashcard.comment}"
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {flashcard.time_estimate} {flashcard.time_unit === 'minutes' ? 'min' : 'h'}
                      </span>
                      {flashcard.is_timed_task && (
                        <Badge variant="outline" className="text-xs">
                          Na czas
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEditModal(flashcard)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDeleteDialog(flashcard)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj fiszkę</DialogTitle>
            <DialogDescription>
              Utwórz nową fiszkę globalną
            </DialogDescription>
          </DialogHeader>

          <FlashcardForm />

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Anuluj
            </Button>
            <Button 
              onClick={handleAddFlashcard} 
              disabled={isSubmitting || !formData.task.trim() || !formData.category}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Dodaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Flashcard Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edytuj fiszkę</DialogTitle>
            <DialogDescription>
              Zmień szczegóły fiszki
            </DialogDescription>
          </DialogHeader>

          <FlashcardForm />

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Anuluj
            </Button>
            <Button 
              onClick={handleUpdateFlashcard} 
              disabled={isSubmitting || !formData.task.trim()}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń fiszkę</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć tę fiszkę? Ta akcja jest nieodwracalna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFlashcard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  );
}
