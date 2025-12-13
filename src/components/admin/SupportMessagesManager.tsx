import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageCircle, Mail, Trash2, Loader2, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn, maskEmail } from '@/lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface SupportMessage {
  id: string;
  user_id: string;
  user_email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function SupportMessagesManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['support-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_support_messages_for_admin');
      
      if (error) throw error;
      return (data || []) as SupportMessage[];
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('support_messages')
        .update({ is_read: true })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-messages'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('support_messages')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      if (user?.id) {
        await supabase.rpc('log_admin_activity', {
          p_admin_user_id: user.id,
          p_action_type: 'delete_support_message',
          p_target_table: 'support_messages',
          p_target_id: id,
          p_details: null
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-messages'] });
      toast({
        title: "Wiadomość usunięta",
        description: "Wiadomość została pomyślnie usunięta.",
      });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć wiadomości.",
        variant: "destructive",
      });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('support_messages')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      
      if (user?.id) {
        await supabase.rpc('log_admin_activity', {
          p_admin_user_id: user.id,
          p_action_type: 'bulk_delete_support_messages',
          p_target_table: 'support_messages',
          p_target_id: null,
          p_details: { deleted_count: ids.length }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-messages'] });
      setSelectedIds(new Set());
      toast({
        title: "Wiadomości usunięte",
        description: `Usunięto ${selectedIds.size} wiadomości.`,
      });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć wiadomości.",
        variant: "destructive",
      });
    }
  });

  const replyMutation = useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message: string }) => {
      const { error } = await supabase
        .from('notifications')
        .insert({
          title: 'Odpowiedź od zespołu odgruzuj.pl',
          message: message,
          created_by: user?.id,
          target_user_id: userId
        });
      
      if (error) throw error;
      
      if (user?.id) {
        await supabase.rpc('log_admin_activity', {
          p_admin_user_id: user.id,
          p_action_type: 'reply_support_message',
          p_target_table: 'notifications',
          p_target_id: userId,
          p_details: { message_preview: message.substring(0, 100) }
        });
      }
    },
    onSuccess: () => {
      setReplyText('');
      setReplyingTo(null);
      toast({
        title: "Odpowiedź wysłana",
        description: "Użytkownik otrzyma powiadomienie w aplikacji.",
      });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się wysłać odpowiedzi.",
        variant: "destructive",
      });
    }
  });

  const unreadCount = messages.filter(m => !m.is_read).length;

  const handleReply = (messageData: SupportMessage) => {
    if (replyingTo === messageData.id) {
      setReplyingTo(null);
      setReplyText('');
    } else {
      setReplyingTo(messageData.id);
      setReplyText('');
    }
  };

  const sendReply = (userId: string) => {
    if (!replyText.trim()) return;
    replyMutation.mutate({ userId, message: replyText.trim() });
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      const message = messages.find(m => m.id === id);
      if (message && !message.is_read) {
        markAsReadMutation.mutate(id);
      }
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map(m => m.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  return (
    <Card className="bg-card border-border mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <MessageCircle className="h-5 w-5 text-primary" />
          Wiadomości od użytkowników
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              {unreadCount}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Brak wiadomości od użytkowników</p>
          </div>
        ) : (
          <>
            {/* Bulk actions bar */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
              <Checkbox
                checked={selectedIds.size === messages.length && messages.length > 0}
                onCheckedChange={toggleSelectAll}
                aria-label="Zaznacz wszystkie"
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0 
                  ? `Zaznaczono: ${selectedIds.size}` 
                  : 'Zaznacz wszystkie'}
              </span>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                  className="ml-auto"
                >
                  {bulkDeleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Usuń zaznaczone ({selectedIds.size})
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "border rounded-xl overflow-hidden transition-colors",
                    message.is_read ? "border-border bg-background" : "border-primary/50 bg-primary/5",
                    selectedIds.has(message.id) && "ring-2 ring-primary"
                  )}
                >
                  <div className="flex items-center">
                    {/* Checkbox */}
                    <div 
                      className="p-4 flex-shrink-0"
                      onClick={(e) => toggleSelect(message.id, e)}
                    >
                      <Checkbox
                        checked={selectedIds.has(message.id)}
                        onCheckedChange={() => {}}
                        aria-label="Zaznacz wiadomość"
                      />
                    </div>
                    
                    {/* Message header button */}
                    <button
                      onClick={() => toggleExpand(message.id)}
                      className="flex-1 p-4 pl-0 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "p-2 rounded-full flex-shrink-0",
                          message.is_read ? "bg-muted" : "bg-primary/20"
                        )}>
                          <Mail className={cn(
                            "h-4 w-4",
                            message.is_read ? "text-muted-foreground" : "text-primary"
                          )} />
                        </div>
                        <div className="min-w-0">
                          <p className={cn(
                            "font-medium truncate",
                            !message.is_read && "text-primary"
                          )}>
                            {maskEmail(message.user_email)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(message.created_at), 'dd MMM yyyy, HH:mm', { locale: pl })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!message.is_read && (
                          <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                        )}
                        {expandedId === message.id ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  </div>
                  
                  {expandedId === message.id && (
                    <div className="px-4 pb-4 border-t border-border">
                      <div className="pt-4">
                        <p className="text-sm whitespace-pre-wrap mb-4">{message.message}</p>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteMutation.mutate(message.id)}
                            disabled={deleteMutation.isPending}
                            title="Usuń wiadomość"
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReply(message)}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">{replyingTo === message.id ? 'Anuluj' : 'Odpowiedz'}</span>
                            <span className="sm:hidden">{replyingTo === message.id ? '✕' : '↩'}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(`mailto:${message.user_email}`, '_blank')}
                            title="Wyślij email"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {replyingTo === message.id && (
                          <div className="space-y-2 pt-2 border-t border-border">
                            <Textarea
                              placeholder="Wpisz odpowiedź dla użytkownika..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className="min-h-[80px]"
                            />
                            <Button
                              size="sm"
                              onClick={() => sendReply(message.user_id)}
                              disabled={!replyText.trim() || replyMutation.isPending}
                            >
                              {replyMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Send className="h-4 w-4 mr-2" />
                              )}
                              Wyślij odpowiedź
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
