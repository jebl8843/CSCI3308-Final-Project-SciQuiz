const tdbApi = require("../resources/js/tdbApi");


test('difficulties field have the correct values?', () => {
    expect(tdbApi.difficulties).toStrictEqual(["easy", "medium", "hard"]);
});

test('categories field have the correct values?', () => {
    expect(tdbApi.categories).toContain("General Knowledge");
    expect(tdbApi.categories).toContain("Entertainment: Books");
    expect(tdbApi.categories).toContain("Entertainment: Film");
    expect(tdbApi.categories).not.toContain(null);
    expect(tdbApi.categories).not.toBeNull();
});

test('do we produce valid questions in time?', async () => {
    const question = await tdbApi.getQuestion("General Knowledge", 'hard');
    expect(question).not.toBeNull();

    expect(question).toHaveProperty('question');
    expect(question).toHaveProperty('answers');
    expect(question).toHaveProperty('correct');

    expect(typeof question.question).toBe('string');
    expect(Array.isArray(question.answers)).toBe(true);
    expect(question.answers.length).toBe(4);
    expect(question.answers).toContain(question.correct);
});