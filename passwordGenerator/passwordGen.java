package personalProjects;

import java.util.Random;
import java.util.Scanner;

public class passwordGen {

	public static void main(String[] args) {
		//get user input
		Scanner in = new Scanner(System.in);
		System.out.print("How long do you want your password to be?");
		int total = in.nextInt();
		//create password with requested length
		System.out.println(generatePassword(total));
	}
	private static char[] generatePassword(int total) {
		//create string of possible characters
		String capitalLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		String lowerLetters = "abcdefghijklmnopqrstuvwxyz";
		String specialCharacters = "!@#$%^&*()";
		String numbers = "1234567890";
		String combinedChars = capitalLetters + lowerLetters + specialCharacters + numbers;
		Random random = new Random();
		
		//create array of password
		char[] password = new char[total];
		//each index is possible random character
		password[0] = capitalLetters.charAt(random.nextInt(capitalLetters.length()));
		password[1] = lowerLetters.charAt(random.nextInt(lowerLetters.length()));
		password[2] = specialCharacters.charAt(random.nextInt(specialCharacters.length()));
		password[3] = numbers.charAt(random.nextInt(numbers.length()));
		
		for(int i = 0; i < total; i++) {
			//creates random password
			password[i] = combinedChars.charAt(random.nextInt(combinedChars.length())); 
		}
		return password;
	}
}

