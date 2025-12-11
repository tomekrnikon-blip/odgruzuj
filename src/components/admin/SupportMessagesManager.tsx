import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Mail, Trash2, Check, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
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

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['support-messages'],
    queryFn: async () => {
      // Use secure RPC function that handles email decryption server-side
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
      
      // Log admin activity
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

  const unreadCount = messages.filter(m => !m.is_read).length;

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
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "border rounded-xl overflow-hidden transition-colors",
                  message.is_read ? "border-border bg-background" : "border-primary/50 bg-primary/5"
                )}
              >
                <button
                  onClick={() => toggleExpand(message.id)}
                  className="w-full p-4 flex items-center justify-between text-left"
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
                
                {expandedId === message.id && (
                  <div className="px-4 pb-4 border-t border-border">
                    <div className="pt-4">
                      <p className="text-sm whitespace-pre-wrap mb-4">{message.message}</p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`mailto:${message.user_email}`, '_blank')}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Odpowiedz
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMutation.mutate(message.id)}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
