import { getStoryblokApi } from '@storyblok/react/rsc';

export default async function Home() {
    const storyblokApi = getStoryblokApi();
    try {
        const { data } = await storyblokApi.get('cdn/stories/bank-list', {
            version: 'draft', // Змініть на 'published' для продакшену
        });

        const content = data.story.content;

        return (
            <main className="container mx-auto p-4">
                <h1 className="text-3xl font-bold">{content.name}</h1>
                <p className="text-lg">ID: {content.id}</p>
                <h2 className="text-xl font-semibold">Курси валют:</h2>
                <table className="table-auto mt-4">
                    <thead>
                    <tr>
                        <th className="px-4 py-2">Валюта</th>
                        <th className="px-4 py-2">Купівля</th>
                        <th className="px-4 py-2">Продаж</th>
                    </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
            </main>
        );
    } catch (error) {
        return (
            <main className="container mx-auto p-4">
                <p>Перевірте, чи існує Story зі slug "bank-list" у Storyblok.</p>
            </main>
        );
    }
}

export const revalidate = 3600; // Оновлення кожну годину