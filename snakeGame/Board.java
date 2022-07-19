package personalProjects;

import java.awt.Color;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics;
import java.awt.GridBagLayout;
import java.awt.Image;
import java.awt.Toolkit;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import javax.swing.ImageIcon;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.Timer;

public class Board extends JPanel implements ActionListener {
	// variables for board
	private final int width = 500;
	private final int height = 500;
	private final int dotSize = 10;
	private final int allDots = 2500;
	private final int randPos = 49;
	private final int delay = 60;
	// x and y variables for snake
	private final int x[] = new int[allDots];
	private final int y[] = new int[allDots];
	// variables for images
	private Image ball;
	private Image apple;
	private Image head;
	// variables for game
	private int dots;
	private int score;
	private Timer timer;
	private int apple_x;
	private int apple_y;
	private boolean left = false;
	private boolean right = true;
	private boolean up = false;
	private boolean down = false;
	private boolean alive = true;

	public Board() {
		Frame();
	}

	private void Frame() {
		addKeyListener(new TAdapter());
		setBackground(Color.black);
		setFocusable(true);

		setPreferredSize(new Dimension(width, height));
		loadImages();
		Game();
	}

	private void loadImages() {
		ImageIcon iid = new ImageIcon("snake/resources/dot.png");
		ball = iid.getImage();
		ImageIcon iia = new ImageIcon("snake/resources/apple.png");
		apple = iia.getImage();
		ImageIcon iih = new ImageIcon("snake/resources/head.png");
		head = iih.getImage();
	}

	private void Game() {
		dots = 3;
		score = 0;
		for (int i = 0; i < dots; i++) {
			x[i] = 50 - i * 10;
			y[i] = 50;
		}

		locateApple();

		timer = new Timer(delay, this);
		timer.start();
	}

	@Override
	public void paintComponent(Graphics g) {
		super.paintComponent(g);

		doDrawing(g);
	}

	private void doDrawing(Graphics g) {
		if (alive) {
			g.drawImage(apple, apple_x, apple_y, this);
			for (int i = 0; i < dots; i++) {
				if (i == 0) {
					g.drawImage(head, x[i], y[i], this);
				} else {
					g.drawImage(ball, x[i], y[i], this);
				}
			}

			Toolkit.getDefaultToolkit().sync();
		} else {
			gameOver(g);
		}
	}

	private void gameOver(Graphics g) {
		String msg = "Game Over";
		Font small = new Font("Helvetica", Font.BOLD, 14);
		FontMetrics meter = getFontMetrics(small);

		g.setColor(Color.white);
		g.setFont(small);
		g.drawString(msg, (width - meter.stringWidth(msg)) / 2, width / 2);

		String smsg = "Your Score: " + score;

		g.setColor(Color.white);
		g.setFont(small);
		g.drawString(smsg, (width - meter.stringWidth(smsg)) / 2, width / 3);
	}

	private void checkApple() {
		if ((x[0] == apple_x) && (y[0] == apple_y)) {
			score++;
			dots++;
			locateApple();
		}
	}

	private void locateApple() {
		int xr = (int) (Math.random() * randPos);
		apple_x = xr * dotSize;
		int yr = (int) (Math.random() * randPos);
		apple_y = yr * dotSize;
	}

	private void move() {
		for (int i = dots; i > 0; i--) {
			x[i] = x[i - 1];
			y[i] = y[i - 1];
		}
		if (left) {
			x[0] -= dotSize;
		}
		if (right) {
			x[0] += dotSize;
		}
		if (up) {
			y[0] -= dotSize;
		}
		if (down) {
			y[0] += dotSize;
		}
	}

	private void checkCollision() {
		for (int i = dots; i > 0; i--) {

			if ((i > 4) && (x[0] == x[i]) && (y[0] == y[i])) {
				alive = false;
			}
		}
		if (y[0] >= height) {
			alive = false;
		}
		if (y[0] < 0) {
			alive = false;
		}
		if (x[0] >= width) {
			alive = false;
		}
		if (x[0] < 0) {
			alive = false;
		}
		if (!alive) {
			timer.stop();
		}
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		if (alive) {
			checkApple();
			checkCollision();
			move();
		}
		repaint();
	}

	private class TAdapter extends KeyAdapter {
		@Override
		public void keyPressed(KeyEvent e) {
			int key = e.getKeyCode();
			if ((key == KeyEvent.VK_LEFT) && (!right)) {
				left = true;
				up = false;
				down = false;
			}
			if ((key == KeyEvent.VK_RIGHT) && (!left)) {
				right = true;
				up = false;
				down = false;
			}
			if ((key == KeyEvent.VK_UP) && (!down)) {
				up = true;
				right = false;
				left = false;
			}
			if ((key == KeyEvent.VK_DOWN) && (!up)) {
				down = true;
				right = false;
				left = false;
			}
		}
	}
}
