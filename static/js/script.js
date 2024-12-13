document.addEventListener("DOMContentLoaded", function() {
    const startButton = document.getElementById("startButton");
    const stopButton = document.getElementById("stopButton");
    const resetButton = document.getElementById("resetButton");
    const incButton = document.getElementById("incButton");
    const decButton = document.getElementById("decButton");
    const output = document.getElementById("output");
    const error = document.getElementById("error");
    let eventSource = null;

    var numList = [["one","won","obama","why","warren"],
                    ["two","to","do","the","womb","tomb","though","tone","oh","doe","soon","don't"],
                    ["three","me","she","he","p.","d.","name","today","rain","game","same","fame","the","c","hey","re","really"],
                    ["for","four","hour","source","ford","force","sold","or","oh","food","soon"],
                    ["five","fi","heim","hi","hive","fine","side","sign","phi","sorry","slime","funny","fry","right","flying","crime","flight"],
                    ["six","his","sis","since","think","weeks","said","hit","sip","still","sick","with"],
                    ["seven","sevin","sevine","sabin","sagan","green","server","savage","win","some"],
                    ["eight","eh","ei","i","aid","aim","hate","ate","take","saved","egg","fake","bake","paid","shade","it"],
                    ["nine","nin","pine","line","fine","man","i'm","mine"],
                    ["ten","tin","then","there","spell","them","til","till"]];

    function increase() {
        var num = parseInt(output.innerHTML);
        if (num === 0) {
            decButton.disabled = false;
            resetButton.disabled = false;
        }
        output.innerHTML = num + 1;
    }

    function decrease() {
        var num = parseInt(output.innerHTML);
        if (num === 1) {
            decButton.disabled = true;
            resetButton.disabled = true;
        }
        output.innerHTML = num - 1;
    }

    incButton.addEventListener("click", () => {
        increase();
    });

    decButton.addEventListener("click", () => {
        decrease();
    });

    // Start listening
    startButton.addEventListener("click", () => {
        fetch('/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start' })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'started') {
                eventSource = new EventSource("/stream");
                eventSource.onmessage = (event) => {
                    if (event.data !== "") {
                        var numAlpha = event.data;
                        var numStrings = numAlpha.split(" ");
                        var numVal = -1;
                        var numDisplay = parseInt(output.innerHTML);
                        for (var i = 0; i < numStrings.length; i++) {
                            for (var j = 0; j < numList.length; j++) {
                                if (numList[j].includes(numStrings[i]) && j === numDisplay) {
                                    numVal = j;
                                    break;
                                }
                            }
                            if(numVal !== -1)
                                break;
                        }
                        if (numVal !== -1) {
                            increase();
                        }
                        /*else {
                            error.innerHTML += event.data+"\n";
                        }*/
                    }

                };
                startButton.disabled = true;
                stopButton.disabled = false;
            }
        });
    });

    // Stop listening
    stopButton.addEventListener("click", () => {
        fetch('/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'stop' })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'stopped') {
                if (eventSource) {
                    eventSource.close(); // Stop the SSE connection
                    eventSource = null;
                }
                startButton.disabled = false;
                stopButton.disabled = true;
            }
        });
    });

    // Reset Count
    resetButton.addEventListener("click", () => {
        output.innerHTML = "0";
        resetButton.disabled = true;
        decButton.disabled = true;
    });

    // Close SSE connection on page unload
    window.addEventListener("beforeunload", () => {
        if (eventSource) {
            eventSource.close(); // Ensure SSE connection is closed
            eventSource = null;
        }

        // Notify the server to reset its state
        fetch('/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).then(() => {
            console.log("Server state reset on reload.");
        });
    });
});


