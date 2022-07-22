package assignment8;

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;

import edu.princeton.cs.introcs.StdDraw;
import support.cse131.ArgsProcessor;
import support.cse131.NotYetImplementedException;
import support.cse131.Timing;
import zombies.ZombieSimulationFiles;

/**
 * @author Dennis Cosgrove (http://www.cse.wustl.edu/~cosgroved/)
 */
public class ZombieSimulator {
	private static final String ZOMBIE_TOKEN_VALUE = "Zombie";
	private List<Entity> list;

	/**
	 * Constructs a ZombieSimulator with an empty list of Entities.
	 */
	public ZombieSimulator() {
		list = new LinkedList<>();

	}

	/**
	 * @return the current list of active entities (that is: those which have not
	 *         been consumed).
	 */
	public List<Entity> getEntities() {
		return this.list;
	}

	/**
	 * Reads an entire zombie simulation file from a specified ArgsProcessor, adding
	 * each Entity to the list of entities.
	 * 
	 * @param ap ArgsProcessor to read the complete zombie simulation file format.
	 */
	public void readEntities(ArgsProcessor ap) {
		int num = ap.nextInt();
		for (int i = 0; i < num; i++) {
			Entity zombie = new Entity(ap.nextString().equals("Zombie"), ap.nextDouble(), ap.nextDouble());
			list.add(zombie);
		}
	}

	/**
	 * @return the number of zombies in entities.
	 */
	public int getZombieCount() {
		int zombieCount = 0;
		for (int i = 0; i < list.size(); i++) {
			if (list.get(i).isZombie()) {
				zombieCount++;
			}
		}
		return zombieCount;
	}

	/**
	 * @return the number of nonzombies in entities.
	 */
	public int getNonzombieCount() {
		int nonZombieCount = 0;
		for (int i = 0; i < list.size(); i++) {
			if (!list.get(i).isZombie()) {
				nonZombieCount++;
			}
		}
		return nonZombieCount;
	}

	/**
	 * Draws a frame of the simulation.
	 */
	public void draw() {
		StdDraw.clear();

		// NOTE: feel free to edit this code to support additional features
		for (Entity entity : getEntities()) {
			entity.draw();
		}

		StdDraw.show(); // commit deferred drawing as a result of enabling double buffering
	}

	/**
	 * Updates the entities for the current frame of the simulation given the amount
	 * of time passed since the previous frame.
	 * 
	 * Note: some entities may be consumed and will not remain for future frames of
	 * the simulation.
	 * 
	 * @param deltaTime the amount of time since the previous frame of the
	 *                  simulation.
	 */
	public void update(double deltaTime) {
		for (int i = 0; i < list.size(); i++) {
			list.get(i).update(list, deltaTime);
		}
	}

	/**
	 * Runs the zombie simulation.
	 * 
	 * @param args arguments from the command line
	 */
	public static void main(String[] args) {
		StdDraw.enableDoubleBuffering(); // reduce unpleasant drawing artifacts, speed things up

		ArgsProcessor ap = ZombieSimulationFiles.createArgsProcessorFromFile(args);
		ZombieSimulator zombieSimulator = new ZombieSimulator();
		zombieSimulator.readEntities(ap);
		zombieSimulator.draw();
		StdDraw.pause(500);

		double prevTime = Timing.getCurrentTimeInSeconds();
		while (zombieSimulator.getNonzombieCount() > 0) {
			double currTime = Timing.getCurrentTimeInSeconds();
			double deltaTime = currTime - prevTime;
			if (deltaTime > 0.0) {
				zombieSimulator.update(deltaTime);
				zombieSimulator.draw();
			}
			StdDraw.pause(10);
			prevTime = currTime;
		}
	}
}
