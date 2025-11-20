// OAT Reading Comprehension Practice Test — React Exam Engine wrapper
(function () {
    "use strict";

    if (window.OATReadingExamLoaded) {
        return;
    }
    window.OATReadingExamLoaded = true;

    const QUESTIONS = [
        {
            stem: "This is a placeholder question for Reading Comprehension Practice Test. The exam interface is fully functional.",
            c: ["Option A", "Option B", "Option C", "Option D"],
            a: 0
        },
        {
            stem: "This is another placeholder question for Reading Comprehension. All exam features work including timer and navigation.",
            c: ["Choice 1", "Choice 2", "Choice 3", "Choice 4"],
            a: 1
        }
    ];

    function registerExam() {
        if (!window.ExamRuntime) {
            console.error("ExamRuntime is not available for Reading Comprehension exam.");
            return;
        }

        try {
            const ExamEngine = window.ExamRuntime.resolve("ExamEngine");
            window.OATReadingExam = function OATReadingExam() {
                return (
                    <ExamEngine
                        subject="Reading Comprehension"
                        title="Reading Comprehension Practice Test"
                        questions={QUESTIONS}
                        storageKey="oat_reading_full_exam_user_state_v1"
                        durationMinutes={30}
                        allowExhibit={false}
                        allowUploads={false}
                    />
                );
            };
        } catch (err) {
            console.error("Unable to initialize Reading Comprehension Exam:", err);
        }
    }

    if (window.examEngineModulesReady) {
        registerExam();
    } else {
        window.addEventListener(
            "examEngineModulesReady",
            registerExam,
            { once: true }
        );
    }
})();

