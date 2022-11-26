import {Category, CategoryNamesPretty, getQuestions as tdbQuestions, QuestionDifficulties} from 'open-trivia-db';

export const categories = Object.keys(CategoryNamesPretty).filter(x => !(parseInt(x) >= 0));

export const difficulties = Object.values(QuestionDifficulties);

export const getQuestion = async (category: CategoryNamesPretty, difficulty?: QuestionDifficulties) => {
    // @ts-ignore
    difficulty ??= Object.keys(QuestionDifficulties)[Math.round(Math.random() * 2)];
    let categoryId = CategoryNamesPretty[category];

    if (!categoryId) throw "You must provide a valid category";

    return (await tdbQuestions({
        amount: 1,
        difficulty: difficulty,
        type: 'multiple',
        category: categoryId,
    })).map(result => ({
        question: result.value,
        answers: result.allAnswers,
        correct: result.correctAnswer
    }))[0];
}