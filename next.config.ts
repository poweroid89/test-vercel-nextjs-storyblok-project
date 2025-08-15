/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        domains: ['bri.co.id'], // дозвіл на завантаження картинок з bri.co.id
    },
};

module.exports = nextConfig;