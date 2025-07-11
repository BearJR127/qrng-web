import java.applet.Applet;
import java.awt.*;
import java.util.Random;

public class ColorGuessApplet extends Applet {
    private final String[] COLORS = {"Red", "Blue", "Green", "Yellow"};
    private Choice colorChoice;
    private Button guessButton;
    private Label resultLabel;
    private Random random;
    private String currentColor;

    @Override
    public void init() {
        setLayout(new FlowLayout());
        add(new Label("Select a Color:"));
        colorChoice = new Choice();
        for (String c : COLORS) {
            colorChoice.add(c);
        }
        add(colorChoice);
        guessButton = new Button("Guess");
        add(guessButton);
        resultLabel = new Label("");
        add(resultLabel);
        random = new Random();
        nextColor();
        guessButton.addActionListener(e -> checkGuess());
    }

    private void nextColor() {
        currentColor = COLORS[random.nextInt(COLORS.length)];
    }

    private void checkGuess() {
        String guess = colorChoice.getSelectedItem();
        if (currentColor.equals(guess)) {
            resultLabel.setText("Correct!");
        } else {
            resultLabel.setText("Wrong! It was " + currentColor);
        }
        nextColor();
    }
}
