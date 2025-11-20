(function registerExamEngine() {
    const runtime = window.ExamRuntime;
    if (!runtime) {
        console.error("ExamRuntime must be initialized before ExamEngine.");
        return;
    }

    runtime.register("ExamEngine", () => {
        const CustomButton = runtime.resolve("CustomButton");
        const { useCallback, useEffect, useMemo, useRef, useState } = React;

        const BUTTON_KEYS = [
            "previous",
            "next",
            "mark",
            "review",
            "exhibit",
            "end",
            "highlight",
            "review-marked",
            "review-all",
            "review-incomplete"
        ];

        const DEFAULT_THEME = BUTTON_KEYS.reduce((acc, key) => {
            acc[key] = { image: null, useCustom: false };
            return acc;
        }, {});

        function shapeTheme(candidate) {
            const shaped = {};
            BUTTON_KEYS.forEach((key) => {
                const value = candidate && candidate[key];
                shaped[key] = {
                    image: value && typeof value.image === "string" ? value.image : null,
                    useCustom: Boolean(value && value.useCustom)
                };
            });
            return { ...DEFAULT_THEME, ...shaped };
        }

        function readButtonTheme() {
            if (typeof window === "undefined" || !window.localStorage) {
                return { ...DEFAULT_THEME };
            }

            const candidateKeys = [
                "exam_button_theme",
                "oat_exam_button_theme",
                "exam_button_config",
                "test_button_theme",
                "button_theme_config"
            ];

            for (const key of candidateKeys) {
                try {
                    const raw = window.localStorage.getItem(key);
                    if (!raw) continue;
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed === "object") {
                        return shapeTheme(parsed);
                    }
                } catch (err) {
                    console.warn("Failed to parse button theme", key, err);
                }
            }

            try {
                for (let i = 0; i < window.localStorage.length; i++) {
                    const key = window.localStorage.key(i);
                    if (!key) continue;
                    const raw = window.localStorage.getItem(key);
                    if (!raw || !raw.includes("\"previous\"") || !raw.includes("\"next\"")) continue;
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed === "object" && parsed.previous && parsed.next) {
                        return shapeTheme(parsed);
                    }
                }
            } catch (err) {
                console.warn("Unable to scan localStorage for button themes", err);
            }

            return { ...DEFAULT_THEME };
        }

        function useButtonTheme() {
            const [theme, setTheme] = useState(() => readButtonTheme());

            useEffect(() => {
                const updateTheme = () => {
                    setTheme(readButtonTheme());
                    // Also trigger DOM button updates
                    setTimeout(() => {
                        if (typeof window.applyExamButtonTheme === 'function') {
                            window.applyExamButtonTheme();
                        }
                    }, 50);
                };
                window.addEventListener("storage", updateTheme);
                window.addEventListener("buttonThemeUpdated", updateTheme);
                const interval = setInterval(updateTheme, 750);

                return () => {
                    window.removeEventListener("storage", updateTheme);
                    window.removeEventListener("buttonThemeUpdated", updateTheme);
                    clearInterval(interval);
                };
            }, []);

            return theme;
        }

        function formatTime(seconds) {
            if (seconds === null || typeof seconds === "undefined") return "--:--";
            const clamped = Math.max(0, seconds);
            const minutes = Math.floor(clamped / 60)
                .toString()
                .padStart(2, "0");
            const secs = (clamped % 60).toString().padStart(2, "0");
            return `${minutes}:${secs}`;
        }

        // HighlightableText removed - using DOM-based highlighting system from script.js
        function HighlightableText({ children }) {
            // Just a simple wrapper - highlighting is handled by the DOM system
            return <div>{children}</div>;
        }

        function UploadButton({ onUpload }) {
            const inputRef = useRef(null);

            const handleClick = () => inputRef.current?.click();

            const handleFileChange = (event) => {
                const file = event.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target?.result;
                    if (typeof result === "string") {
                        onUpload(result);
                    }
                };
                reader.readAsDataURL(file);
                event.target.value = "";
            };

            return (
                <div className="flex items-center">
                    <button
                        type="button"
                        onClick={handleClick}
                        className="clearcoat-button-default"
                    >
                        Upload File
                    </button>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                    />
                </div>
            );
        }

        function usePersistentExamState(storageKey) {
            const [answers, setAnswers] = useState({});
            const [marked, setMarked] = useState({});

            useEffect(() => {
                if (typeof window === "undefined" || !window.localStorage) return;
                try {
                    const raw = window.localStorage.getItem(storageKey);
                    if (!raw) return;
                    const parsed = JSON.parse(raw);
                    if (parsed.answers) setAnswers(parsed.answers);
                    if (parsed.marked) setMarked(parsed.marked);
                } catch (err) {
                    console.warn("Failed to parse stored exam state", err);
                }
            }, [storageKey]);

            useEffect(() => {
                if (typeof window === "undefined" || !window.localStorage) return;
                try {
                    const payload = JSON.stringify({ answers, marked });
                    window.localStorage.setItem(storageKey, payload);
                } catch (err) {
                    console.warn("Unable to persist exam state", err);
                }
            }, [answers, marked, storageKey]);

            return { answers, setAnswers, marked, setMarked };
        }

        function TestFooter({
            subject,
            currentIndex,
            totalQuestions,
            isMarked,
            onPrevious,
            onNext,
            onMark,
            onReview,
            showExhibit,
            onExhibit,
            allowUploads,
            onUploadFile,
            delayOn,
            buttonTheme,
            highlightTheme
        }) {
            const isFirst = currentIndex === 0;
            const isLast = currentIndex >= totalQuestions - 1;
            const nextLabel = isLast ? "END SECTION" : "NEXT";
            const shouldCenterNext =
                (subject === "General Chemistry" || subject === "Quantitative Reasoning") && showExhibit;
            const barClassName = [
                "fixed-bottom-bar flex items-center justify-between h-[60px] px-6 bg-[#0e5c84]",
                shouldCenterNext ? "has-exhibit-button" : ""
            ]
                .filter(Boolean)
                .join(" ");
            return (
                <div className={barClassName}>
                    <div className="flex gap-2">
                        <CustomButton
                            theme={buttonTheme.previous}
                            defaultLabel="PREVIOUS"
                            onClick={onPrevious}
                            disabled={isFirst}
                            buttonKey="previous"
                        />
                    </div>
                    <div className="next-button-container flex justify-center flex-1">
                        <CustomButton
                            theme={buttonTheme.next}
                            defaultLabel={nextLabel}
                            onClick={onNext}
                            buttonKey="next"
                        />
                    </div>
                    <div className="flex gap-2 items-center">
                        <CustomButton
                            theme={buttonTheme.mark}
                            defaultLabel={isMarked ? "MARKED" : "MARK"}
                            onClick={onMark}
                            buttonKey="mark"
                        />
                        {showExhibit && (
                            <CustomButton
                                theme={buttonTheme.exhibit}
                                defaultLabel="EXHIBIT"
                                onClick={onExhibit}
                                buttonKey="exhibit"
                            />
                        )}
                        {allowUploads && <UploadButton onUpload={onUploadFile} />}
                        <CustomButton
                            theme={buttonTheme.review}
                            defaultLabel={delayOn ? "REVIEW (DELAY)" : "REVIEW"}
                            onClick={onReview}
                            buttonKey="review"
                        />
                    </div>
                </div>
            );
        }

        function ReviewFooter({
            onReviewMarked,
            onReviewAll,
            onReviewIncomplete,
            onEnd,
            firstMarked,
            firstIncomplete,
            buttonTheme,
            highlightTheme
        }) {
            return (
                <div className="flex items-center justify-between bg-[#0e5c84] h-[64px] px-6">
                    <div className="flex gap-4 items-center">
                        <CustomButton
                            theme={buttonTheme["review-marked"]}
                            defaultLabel="REVIEW MARKED"
                            onClick={onReviewMarked}
                            disabled={firstMarked === -1}
                            buttonKey="review-marked"
                        />
                        <CustomButton
                            theme={buttonTheme["review-all"]}
                            defaultLabel="REVIEW ALL"
                            onClick={onReviewAll}
                            buttonKey="review-all"
                        />
                        <CustomButton
                            theme={buttonTheme["review-incomplete"]}
                            defaultLabel="REVIEW INCOMPLETE"
                            onClick={onReviewIncomplete}
                            disabled={firstIncomplete === -1}
                            buttonKey="review-incomplete"
                        />
                    </div>
                    <CustomButton
                        theme={buttonTheme.end}
                        defaultLabel="END"
                        onClick={onEnd}
                        buttonKey="end"
                    />
                </div>
            );
        }

        function ExamEngine({
            subject = "Exam",
            title,
            questions = [],
            storageKey,
            durationMinutes = 30,
            allowExhibit = false,
            exhibitContent = null,
            allowUploads = true
        }) {
            const buttonTheme = useButtonTheme();
            const highlightTheme = buttonTheme.highlight;
            const resolvedTitle = title || `${subject} Practice Test`;
            const resolvedStorageKey =
                storageKey || `${subject.replace(/\s+/g, "_").toLowerCase()}_exam_state_v2`;

            return (
                <ExamEngineInner
                    subject={subject}
                    title={resolvedTitle}
                    questions={questions}
                    storageKey={resolvedStorageKey}
                    durationMinutes={durationMinutes}
                    allowExhibit={allowExhibit}
                    exhibitContent={exhibitContent}
                    allowUploads={allowUploads}
                    buttonTheme={buttonTheme}
                    highlightTheme={highlightTheme}
                />
            );
        }

        function ExamEngineInner({
            subject,
            title,
            questions,
            storageKey,
            durationMinutes,
            allowExhibit,
            exhibitContent,
            allowUploads,
            buttonTheme,
            highlightTheme
        }) {
            const [view, setView] = useState("intro");
            const [currentIndex, setCurrentIndex] = useState(0);
            const [delayOn, setDelayOn] = useState(true);
            const [accommodations, setAccommodations] = useState(false);
            const [timeLeft, setTimeLeft] = useState(null);
            const [showExhibitModal, setShowExhibitModal] = useState(false);
            const [uploads, setUploads] = useState({});

            const { answers, setAnswers, marked, setMarked } = usePersistentExamState(storageKey);

            useEffect(() => {
                if (view !== "test" || timeLeft === null) return;
                if (timeLeft <= 0) {
                    setView("results");
                    return;
                }
                const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
                return () => clearTimeout(timer);
            }, [view, timeLeft]);

            // Apply DOM button themes when view changes
            useEffect(() => {
                if (view === "test" || view === "review") {
                    setTimeout(() => {
                        if (typeof window.applyExamButtonTheme === 'function') {
                            window.applyExamButtonTheme();
                        }
                    }, 100);
                }
            }, [view]);

            const performWithDelay = useCallback(
                (fn) => {
                    if (!delayOn) {
                        fn();
                        return;
                    }
                    setTimeout(fn, 2000);
                },
                [delayOn]
            );

            const startExam = () => {
                const baseSeconds = durationMinutes * 60;
                const totalSeconds = accommodations ? Math.floor(baseSeconds * 1.5) : baseSeconds;
                setTimeLeft(totalSeconds);
                setCurrentIndex(0);
                setView("test");
            };

            const handlePrevious = () => {
                if (currentIndex === 0) return;
                performWithDelay(() =>
                    setCurrentIndex((prev) => Math.max(0, prev - 1))
                );
            };

            const handleNext = () => {
                const isLast = currentIndex >= questions.length - 1;
                const action = () => {
                    if (isLast) {
                        if (typeof window.showEndTestModalReact === "function") {
                            window.showEndTestModalReact();
                        } else {
                            setView("results");
                        }
                    } else {
                        setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
                    }
                };
                performWithDelay(action);
            };

            const handleSelectChoice = (choiceIndex) => {
                setAnswers((prev) => ({
                    ...prev,
                    [currentIndex]: choiceIndex
                }));
            };

            const handleMark = () => {
                setMarked((prev) => ({
                    ...prev,
                    [currentIndex]: !prev[currentIndex]
                }));
            };

            const handleReview = () => {
                performWithDelay(() => setView("review"));
            };

            const handleJumpToQuestion = (index) => {
                if (index < 0 || index >= questions.length) return;
                setCurrentIndex(index);
                performWithDelay(() => setView("test"));
            };

            const handleUploadForQuestion = (fileData) => {
                setUploads((prev) => ({
                    ...prev,
                    [currentIndex]: fileData
                }));
            };

            const handleEnd = () => {
                if (typeof window.showEndTestModalReact === "function") {
                    window.showEndTestModalReact();
                } else {
                    setView("results");
                }
            };

            const reviewRows = useMemo(
                () =>
                    questions.map((_, index) => ({
                        index,
                        name: `Question ${index + 1}`,
                        isMarked: Boolean(marked[index]),
                        isDone: answers[index] !== undefined,
                        isSkipped: answers[index] === undefined
                    })),
                [answers, marked, questions]
            );

            const firstMarked = reviewRows.findIndex((row) => row.isMarked);
            const firstIncomplete = reviewRows.findIndex((row) => !row.isDone);

            const score = useMemo(() => {
                let correct = 0;
                questions.forEach((question, index) => {
                    if (answers[index] === question.a) correct += 1;
                });
                return { correct, total: questions.length };
            }, [answers, questions]);

            const currentQuestion = questions[currentIndex] || {};
            const uploadedAsset = uploads[currentIndex];

            const renderUploadPreview = () => {
                if (!uploadedAsset) return null;
                if (uploadedAsset.startsWith("data:image/")) {
                    return (
                        <div className="mb-3 flex justify-center">
                            <img
                                src={uploadedAsset}
                                alt="Uploaded attachment"
                                className="max-h-40 object-contain rounded border border-gray-300"
                            />
                        </div>
                    );
                }
                if (uploadedAsset.startsWith("data:application/pdf")) {
                    return (
                        <div className="p-4 border border-gray-300 rounded bg-gray-50 mb-3">
                            <p className="text-sm text-gray-600 mb-2">PDF uploaded</p>
                            <a
                                href={uploadedAsset}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline text-sm"
                            >
                                Open PDF
                            </a>
                        </div>
                    );
                }
                return null;
            };

            const renderIntro = () => (
                <div className="flex flex-col h-screen bg-white">
                    <div className="flex items-center justify-between bg-[#0e5c84] text-white px-4 h-[54px]">
                        <button
                            type="button"
                            aria-label="Close"
                            className="w-8 h-8 rounded-full bg-[#2d6f93] flex items-center justify-center text-xl leading-none"
                            onClick={() => window.showView?.("subject-pages")}
                        >
                            ×
                        </button>
                        <div className="text-center leading-tight">
                            <div className="text-sm">Optofutureprep | OAT</div>
                            <div className="text-[11px] opacity-90">{title}</div>
                        </div>
                        <div className="text-[11px] opacity-90">&nbsp;</div>
                    </div>
                    <div className="flex-1 flex justify-center items-start pt-10 pb-6 overflow-auto bg-white">
                        <div className="w-[62%] min-w-[740px] bg-white">
                            <div className="border-2 border-black p-8 mb-6">
                                <h2 className="font-semibold text-lg mb-2">
                                    This is {subject} Practice Test. Read before starting:
                                </h2>
                                <ol className="list-decimal ml-6 space-y-1 text-sm">
                                    <li>You have {durationMinutes} minutes to finish {questions.length} questions.</li>
                                    <li>You can review questions before ending the section.</li>
                                    <li>Your score analysis appears after finishing.</li>
                                </ol>
                                <p className="text-sm mt-4">Click NEXT to continue.</p>
                            </div>
                            <h3 className="font-semibold mb-2">Test Settings</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 bg-slate-100 border rounded p-3">
                                    <button
                                        type="button"
                                        onClick={() => setDelayOn((prev) => !prev)}
                                        className={`w-12 h-6 rounded-full transition ${
                                            delayOn ? "bg-green-500" : "bg-slate-300"
                                        }`}
                                    >
                                        <span
                                            className={`block h-6 w-6 bg-white rounded-full transition ${
                                                delayOn ? "translate-x-6" : ""
                                            }`}
                                        />
                                    </button>
                                    <div className="text-sm">
                                        <span className="font-semibold">Prometric Delay:</span> Adds ~2s delay on navigation and review.
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-slate-100 border rounded p-3">
                                    <button
                                        type="button"
                                        onClick={() => setAccommodations((prev) => !prev)}
                                        className={`w-12 h-6 rounded-full transition ${
                                            accommodations ? "bg-green-500" : "bg-slate-300"
                                        }`}
                                    >
                                        <span
                                            className={`block h-6 w-6 bg-white rounded-full transition ${
                                                accommodations ? "translate-x-6" : ""
                                            }`}
                                        />
                                    </button>
                                    <div className="text-sm">
                                        <span className="font-semibold">Time Accommodations:</span> 1.5x time if enabled.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-center bg-[#0e5c84] h-[64px] px-6">
                        <button
                            type="button"
                            className="clearcoat-button-default"
                            onClick={startExam}
                        >
                            NEXT
                        </button>
                    </div>
                </div>
            );

            const renderTest = () => (
                <div className="flex flex-col h-screen bg-white">
                    <div className="flex items-center justify-between bg-[#0a6ea0] text-white px-6 py-2 h-[46px]">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => window.showExitTestModalReact?.()}
                                aria-label="Close"
                                className="exam-close-btn w-8 h-8 rounded-full flex items-center justify-center text-xl leading-none"
                            >
                                ×
                            </button>
                            <div className="text-sm font-semibold">
                                Question {currentIndex + 1} of {questions.length}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-[11px] opacity-90" style={{ fontFamily: "Arial, sans-serif" }}>
                                Optofutureprep | OAT
                            </div>
                            <div className="text-[10px] opacity-80" style={{ fontFamily: "Arial, sans-serif" }}>
                                {title}
                            </div>
                        </div>
                        <div className="text-sm">Time remaining: {formatTime(timeLeft)}</div>
                    </div>
                    <div className="flex-1 flex justify-center items-start pt-8 pb-6 overflow-y-auto bg-white">
                        <div className="w-[62%] min-w-[740px] bg-white border-2 border-black shadow-lg p-8 relative">
                            {renderUploadPreview()}
                            <HighlightableText>
                                <div className="mb-5">
                                    <p className="mb-4 leading-relaxed">{currentQuestion.stem}</p>
                                    <div className="flex flex-col gap-3 text-sm">
                                        {(currentQuestion.c || []).map((choice, index) => (
                                            <label
                                                key={index}
                                                className="flex items-start gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded"
                                            >
                                                <input
                                                    type="radio"
                                                    className="mt-1"
                                                    checked={answers[currentIndex] === index}
                                                    onChange={() => handleSelectChoice(index)}
                                                />
                                                <span className="flex-1 cursor-pointer">
                                                    {String.fromCharCode(65 + index)}. {choice}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </HighlightableText>
                            <p className="mt-6 text-xs text-gray-500">Click NEXT to continue.</p>
                        </div>
                    </div>
                    <TestFooter
                        subject={subject}
                        currentIndex={currentIndex}
                        totalQuestions={questions.length}
                        isMarked={Boolean(marked[currentIndex])}
                        onPrevious={handlePrevious}
                        onNext={handleNext}
                        onMark={handleMark}
                        onReview={handleReview}
                        showExhibit={allowExhibit && Boolean(exhibitContent)}
                        onExhibit={() => setShowExhibitModal(true)}
                        allowUploads={allowUploads}
                        onUploadFile={handleUploadForQuestion}
                        delayOn={delayOn}
                        buttonTheme={buttonTheme}
                        highlightTheme={highlightTheme}
                    />
                    {showExhibitModal && exhibitContent && (
                        <div
                            className="fixed inset-0 bg-black/60 flex justify-center items-center z-50"
                            onClick={() => setShowExhibitModal(false)}
                        >
                            <div
                                className="bg-white rounded shadow-xl w-[90%] max-w-[1100px]"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="flex justify-between items-center border-b px-4 py-2 bg-[#0a6ea0] text-white">
                                    <span>Exhibit</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowExhibitModal(false)}
                                        className="font-bold"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="p-3 overflow-auto max-h-[80vh] bg-white">{exhibitContent}</div>
                            </div>
                        </div>
                    )}
                </div>
            );

            const renderReview = () => (
                <div className="flex flex-col h-screen bg-white">
                    <div className="flex items-center justify-between bg-[#0e5c84] text-white px-4 h-[54px]">
                        <button
                            type="button"
                            aria-label="Close"
                            className="w-8 h-8 rounded-full bg-[#2d6f93] flex items-center justify-center text-xl leading-none"
                            onClick={() => window.showExitTestModalReact?.()}
                        >
                            ×
                        </button>
                        <div className="text-center leading-tight">
                            <div className="text-sm">Optofutureprep | OAT</div>
                            <div className="text-[11px] opacity-90">Review Questions</div>
                        </div>
                        <div className="text-sm whitespace-nowrap">Time remaining: {formatTime(timeLeft)}</div>
                    </div>
                    <div className="flex-1 p-6 bg-white overflow-hidden">
                        <div className="max-w-[980px] mx-auto h-full flex flex-col">
                            <div className="border border-[#6a89a0] shadow-sm flex-1 flex flex-col">
                                <div className="grid grid-cols-4 bg-[#5f85a0] text-white text-sm font-semibold">
                                    <div className="px-3 py-2 border-r border-[#4f7288]">Name</div>
                                    <div className="px-3 py-2 border-r border-[#4f7288]">Marked</div>
                                    <div className="px-3 py-2 border-r border-[#4f7288]">Completed</div>
                                    <div className="px-3 py-2">Skipped</div>
                                </div>
                                <div className="flex-1 overflow-auto bg-white">
                                    {reviewRows.map((row) => (
                                        <button
                                            type="button"
                                            key={row.index}
                                            className="grid grid-cols-4 w-full text-left text-sm hover:bg-[#eef6ff] focus:bg-[#eef6ff]"
                                            onClick={() => handleJumpToQuestion(row.index)}
                                        >
                                            <div className="px-3 py-2 border-t border-[#9eb1bf] border-r flex items-center gap-2">
                                                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden className="text-emerald-600">
                                                    <path
                                                        fill="currentColor"
                                                        d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1v5h5"
                                                    />
                                                </svg>
                                                {row.name}
                                            </div>
                                            <div className="px-3 py-2 border-t border-[#9eb1bf] border-r">
                                                {row.isMarked ? "Yes" : ""}
                                            </div>
                                            <div className="px-3 py-2 border-t border-[#9eb1bf] border-r">
                                                {row.isDone ? "Yes" : ""}
                                            </div>
                                            <div className="px-3 py-2 border-t border-[#9eb1bf]">
                                                {row.isSkipped ? "Yes" : ""}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <ReviewFooter
                        onReviewMarked={() => handleJumpToQuestion(firstMarked)}
                        onReviewAll={() => handleJumpToQuestion(0)}
                        onReviewIncomplete={() => handleJumpToQuestion(firstIncomplete)}
                        onEnd={handleEnd}
                        firstMarked={firstMarked}
                        firstIncomplete={firstIncomplete}
                        buttonTheme={buttonTheme}
                        highlightTheme={highlightTheme}
                    />
                </div>
            );

            const renderResults = () => (
                <div className="p-4 flex flex-col gap-3 max-w-4xl mx-auto">
                    <h1 className="text-2xl font-bold">Results</h1>
                    <p className="text-slate-600 text-sm">
                        Score: {score.correct} / {score.total} ({Math.round((score.correct / Math.max(score.total, 1)) * 100)}%).
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-3">
                        {questions.map((question, index) => {
                            const selected = answers[index];
                            const isCorrect = selected === question.a;
                            return (
                                <div
                                    key={index}
                                    className={`border rounded p-3 ${
                                        isCorrect
                                            ? "border-emerald-400 bg-emerald-50"
                                            : "border-rose-300 bg-rose-50"
                                    }`}
                                >
                                    <div className="font-medium mb-2">
                                        {index + 1}. {question.stem}
                                    </div>
                                    <ul className="ml-4 text-sm mb-1 list-disc">
                                        {(question.c || []).map((choice, choiceIndex) => (
                                            <li
                                                key={choiceIndex}
                                                className={choiceIndex === question.a ? "font-semibold" : ""}
                                            >
                                                {String.fromCharCode(65 + choiceIndex)}. {choice}{" "}
                                                {choiceIndex === question.a ? "(correct)" : ""}
                                                {selected === choiceIndex && choiceIndex !== question.a
                                                    ? " (your answer)"
                                                    : ""}
                                            </li>
                                        ))}
                                    </ul>
                                    {marked[index] && (
                                        <div className="text-[11px] inline-block bg-yellow-200 px-2 py-[2px] rounded">
                                            MARKED
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            type="button"
                            className="px-3 py-1 bg-slate-900 text-white rounded"
                            onClick={() => setView("intro")}
                        >
                            Back to Start
                        </button>
                    </div>
                </div>
            );

            if (!questions || questions.length === 0) {
                return (
                    <div className="min-h-screen flex items-center justify-center bg-white">
                        <div className="text-center">
                            <p className="text-lg font-semibold">No questions available for this exam.</p>
                        </div>
                    </div>
                );
            }

            return (
                <div className="min-h-screen bg-slate-100">
                    {view === "intro" && renderIntro()}
                    {view === "test" && renderTest()}
                    {view === "review" && renderReview()}
                    {view === "results" && renderResults()}
                </div>
            );
        }

        return ExamEngine;
    });
})();

