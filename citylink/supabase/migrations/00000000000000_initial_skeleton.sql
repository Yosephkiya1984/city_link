-- supabase/migrations/00000000000000_initial_skeleton.sql
-- ===========================================================================
-- INITIAL SKELETON: Database Structure
-- Generated to capture the base tables and columns for the CityLink super-app.
-- ===========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CORE TABLES

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT UNIQUE,
    full_name TEXT,
    role user_role DEFAULT 'citizen'::user_role,
    kyc_status kyc_status DEFAULT 'NONE'::kyc_status,
    fayda_fin TEXT UNIQUE,
    subcity TEXT,
    woreda TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reject_reason TEXT,
    credit_score INTEGER DEFAULT 300 CHECK (credit_score >= 300 AND credit_score <= 850),
    fayda_token TEXT,
    fayda_verified BOOLEAN DEFAULT FALSE,
    extra_reg_data JSONB,
    pending_otp TEXT,
    pin_hash TEXT,
    pin_attempts INTEGER DEFAULT 0,
    pin_locked_until TIMESTAMPTZ,
    insp_attempts INTEGER DEFAULT 0,
    insp_locked_until TIMESTAMPTZ,
    credit_updated_at TIMESTAMPTZ,
    welcome_bonus_paid BOOLEAN DEFAULT FALSE,
    onboarded BOOLEAN DEFAULT FALSE,
    email TEXT UNIQUE,
    badge_id TEXT,
    sec_pin TEXT,
    daily_rejection_count INTEGER DEFAULT 0,
    last_rejection_at TIMESTAMPTZ
);

-- wallets
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance NUMERIC DEFAULT 0.00 CHECK (balance >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- merchants
CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_name TEXT,
    merchant_type TEXT,
    merchant_status TEXT DEFAULT 'NONE',
    tin TEXT,
    license_no TEXT,
    trade_license TEXT,
    merchant_details JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- delivery_agents
CREATE TABLE IF NOT EXISTS public.delivery_agents (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    vehicle_type TEXT CHECK (vehicle_type IN ('bicycle', 'motorcycle', 'car', 'tuktuk', 'foot', 'van', 'truck')),
    plate_number TEXT,
    license_number TEXT,
    is_online BOOLEAN DEFAULT FALSE,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    location_updated_at TIMESTAMPTZ,
    agent_status TEXT DEFAULT 'PENDING' CHECK (agent_status IN ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED')),
    total_deliveries INTEGER DEFAULT 0,
    rating NUMERIC DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    badge_id TEXT,
    can_start_journey BOOLEAN DEFAULT TRUE,
    blocked_until TIMESTAMPTZ,
    last_block_reason TEXT
);

-- products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price NUMERIC NOT NULL,
    image_url TEXT,
    icon TEXT DEFAULT '📦',
    status TEXT DEFAULT 'active',
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    images_json JSONB DEFAULT '[]'::JSONB,
    condition TEXT DEFAULT 'new' CHECK (condition IN ('new', 'like-new', 'good', 'fair')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- marketplace_orders
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    escrow_id UUID,
    buyer_id UUID REFERENCES public.profiles(id),
    merchant_id UUID REFERENCES public.profiles(id),
    product_id UUID REFERENCES public.products(id),
    product_name TEXT,
    qty INTEGER DEFAULT 1 CHECK (qty > 0),
    quantity INTEGER DEFAULT 1,
    total NUMERIC DEFAULT 0 CHECK (total > 0),
    status TEXT DEFAULT 'PAID' CHECK (status IN ('PAID', 'DISPATCHING', 'AGENT_ASSIGNED', 'IN_TRANSIT', 'AWAITING_PIN', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'REJECTED_BY_BUYER')),
    shipping_address TEXT,
    tracking_number TEXT,
    pickup_pin CHARACTER VARYING,
    delivery_pin TEXT,
    agent_id UUID REFERENCES public.delivery_agents(id),
    agent_fee NUMERIC DEFAULT 0,
    platform_fee NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + '72:00:00'::INTERVAL),
    idempotency_key TEXT UNIQUE DEFAULT (uuid_generate_v4())::TEXT
);

-- escrows
CREATE TABLE IF NOT EXISTS public.escrows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID REFERENCES public.profiles(id),
    merchant_id UUID REFERENCES public.profiles(id),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    service_type TEXT CHECK (service_type IN ('marketplace', 'parking', 'food', 'booking')),
    status escrow_status DEFAULT 'LOCKED'::escrow_status,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    release_method TEXT
);

-- chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    to_user_id UUID REFERENCES public.profiles(id),
    thread_id TEXT,
    role TEXT CHECK (role IN ('user', 'assistant')),
    content TEXT,
    msg_type TEXT DEFAULT 'text',
    read BOOLEAN DEFAULT FALSE,
    listing_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- message_threads
CREATE TABLE IF NOT EXISTS public.message_threads (
    thread_id TEXT PRIMARY KEY,
    user_a_id UUID REFERENCES public.profiles(id),
    user_b_id UUID REFERENCES public.profiles(id),
    listing_id UUID,
    last_msg TEXT,
    last_ts TIMESTAMPTZ DEFAULT NOW(),
    unread_a INTEGER DEFAULT 0,
    unread_b INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    amount NUMERIC NOT NULL,
    type tx_type NOT NULL,
    category TEXT,
    description TEXT,
    reference_id TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- disputes
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID,
    buyer_id UUID REFERENCES public.profiles(id),
    merchant_id UUID REFERENCES public.profiles(id),
    product_name TEXT DEFAULT '',
    amount NUMERIC DEFAULT 0 CHECK (amount >= 0),
    reason TEXT NOT NULL,
    description TEXT,
    stage TEXT DEFAULT 'before_pin' CHECK (stage IN ('before_pin', 'after_pin')),
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'CLOSED')),
    raised_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    read BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- app_config
CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- rate_limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
