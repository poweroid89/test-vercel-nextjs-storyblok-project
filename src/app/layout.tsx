import { storyblokInit, apiPlugin } from '@storyblok/react';
import './globals.css';
import type { Metadata } from 'next';

// Ініціалізація Storyblok
storyblokInit({
    accessToken: process.env.STORYBLOK_TOKEN,
    use: [apiPlugin],
    apiOptions: { region: 'eu' }, // Змініть на 'us', якщо ваш Space у США
});

export const metadata: Metadata = {
    title: 'Bank Info App',
    description: 'Display bank information with Storyblok',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="uk">
        <body>{children}</body>
        </html>
    );
}