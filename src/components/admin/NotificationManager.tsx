import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Bell, Send, Loader2, Smartphone } from 'lucide-react';

export function NotificationManager() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSendingPush, setIsSendingPush] = useState(false);

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Wypełnij tytuł i treść wiadomości');
      return;
    }

    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('notifications')
        .insert({
          title: title.trim(),
          message: message.trim(),
          created_by: user?.id
        });

      if (error) throw error;

      toast.success('Powiadomienie wysłane do wszystkich użytkowników!');
      setTitle('');
      setMessage('');
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast.error('Błąd podczas wysyłania powiadomienia');
    } finally {
      setIsSending(false);
    }
  };

  const handleTestPushNotification = async () => {
    setIsSendingPush(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Brak autoryzacji - zaloguj się ponownie');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: 'Test powiadomienia push',
          body: 'To jest testowe powiadomienie z panelu admina 🔔',
          sendToAll: true
        }
      });

      if (error) throw error;

      if (data?.sent > 0) {
        toast.success(`Push wysłany do ${data.sent} urządzeń!`);
      } else {
        toast.info('Brak aktywnych subskrypcji push');
      }
    } catch (error: any) {
      console.error('Error sending push notification:', error);
      toast.error(`Błąd push: ${error.message || 'Nieznany błąd'}`);
    } finally {
      setIsSendingPush(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Wyślij powiadomienie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="notification-title">Tytuł</Label>
          <Input
            id="notification-title"
            placeholder="Tytuł powiadomienia..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notification-message">Treść wiadomości</Label>
          <Textarea
            id="notification-message"
            placeholder="Treść powiadomienia dla wszystkich użytkowników..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            disabled={isSending}
          />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleSendNotification} 
            disabled={isSending || !title.trim() || !message.trim()}
            className="flex-1"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Wysyłanie...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Wyślij in-app
              </>
            )}
          </Button>
          <Button 
            onClick={handleTestPushNotification} 
            disabled={isSendingPush}
            variant="outline"
          >
            {isSendingPush ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Test...
              </>
            ) : (
              <>
                <Smartphone className="h-4 w-4 mr-2" />
                Test Push
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
