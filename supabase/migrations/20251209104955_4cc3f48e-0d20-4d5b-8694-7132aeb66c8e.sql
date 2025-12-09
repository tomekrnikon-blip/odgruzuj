-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('free', 'active', 'cancelled', 'expired');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  subscription_status subscription_status NOT NULL DEFAULT 'free',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create global flashcards table (admin-managed tasks for all users)
CREATE TABLE public.global_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  task TEXT NOT NULL,
  comment TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  time_estimate INTEGER NOT NULL,
  time_unit TEXT NOT NULL CHECK (time_unit IN ('minutes', 'hours')),
  is_timed_task BOOLEAN NOT NULL DEFAULT true,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user custom flashcards table (for premium users)
CREATE TABLE public.user_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  task TEXT NOT NULL,
  comment TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  time_estimate INTEGER NOT NULL,
  time_unit TEXT NOT NULL CHECK (time_unit IN ('minutes', 'hours')),
  is_timed_task BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user progress table
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  unlocked_badges TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create completed tasks table
CREATE TABLE public.completed_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  flashcard_id UUID,
  flashcard_type TEXT NOT NULL CHECK (flashcard_type IN ('global', 'user', 'local')),
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  time_spent INTEGER NOT NULL DEFAULT 0,
  was_timed_task BOOLEAN NOT NULL DEFAULT false,
  completed_in_time BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_tasks ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to check premium status
CREATE OR REPLACE FUNCTION public.is_premium(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND subscription_status = 'active'
      AND (subscription_expires_at IS NULL OR subscription_expires_at > now())
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User roles policies (only admins can manage roles)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Global flashcards policies
CREATE POLICY "Everyone can view non-premium global flashcards"
  ON public.global_flashcards FOR SELECT
  USING (is_premium = false);

CREATE POLICY "Premium users can view all global flashcards"
  ON public.global_flashcards FOR SELECT
  USING (public.is_premium(auth.uid()));

CREATE POLICY "Admins can manage global flashcards"
  ON public.global_flashcards FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- User flashcards policies (premium only)
CREATE POLICY "Premium users can view their flashcards"
  ON public.user_flashcards FOR SELECT
  USING (auth.uid() = user_id AND public.is_premium(auth.uid()));

CREATE POLICY "Premium users can insert their flashcards"
  ON public.user_flashcards FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_premium(auth.uid()));

CREATE POLICY "Premium users can update their flashcards"
  ON public.user_flashcards FOR UPDATE
  USING (auth.uid() = user_id AND public.is_premium(auth.uid()));

CREATE POLICY "Premium users can delete their flashcards"
  ON public.user_flashcards FOR DELETE
  USING (auth.uid() = user_id AND public.is_premium(auth.uid()));

-- User progress policies
CREATE POLICY "Users can view their own progress"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Completed tasks policies
CREATE POLICY "Users can view their completed tasks"
  ON public.completed_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their completed tasks"
  ON public.completed_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger function for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_global_flashcards_updated_at
  BEFORE UPDATE ON public.global_flashcards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_flashcards_updated_at
  BEFORE UPDATE ON public.user_flashcards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();